export const COLLAPSED_COOKIE_NAME = "lh_collapsed_tags";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Cookie の生値（`encodeURIComponent(JSON)`）を開閉状態マップにパースする。
 * サーバー・クライアント双方から利用する純粋関数。
 */
const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function parseCollapsedCookie(raw: string | undefined | null): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean" && !RESERVED_KEYS.has(key)) {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function readRawCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

/**
 * 指定タグの開閉状態を Cookie に書き込む（クライアント専用）。
 */
export function writeCollapsedCookie(key: string, collapsed: boolean) {
  if (typeof document === "undefined") return;
  const map = parseCollapsedCookie(readRawCookie(COLLAPSED_COOKIE_NAME));
  map[key] = collapsed;
  const value = encodeURIComponent(JSON.stringify(map));
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API は非同期かつ対応ブラウザが限定的なため、同期的な UI 状態の書き込みには document.cookie を用いる
  document.cookie = `${COLLAPSED_COOKIE_NAME}=${value};path=/;max-age=${ONE_YEAR_SECONDS};SameSite=Lax`;
}
