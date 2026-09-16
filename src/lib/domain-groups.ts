/**
 * URL からドメイン（hostname）を抽出する。
 * 不正な URL の場合は空文字を返す。
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * 一覧の URL 行に表示する文字列を返す（ホスト名 + パス + クエリ）。
 * スキームとフラグメントは含めず、トップページ（パスが "/" のみ）は末尾の "/" を省く。
 * パス・クエリのパーセントエンコードは日本語などが読めるようデコードする
 * （decodeURI は "/" "?" "&" 等の予約文字は復号しないため構造は崩れない。不正なシーケンスはそのまま）。
 * 不正な URL の場合は入力をそのまま返す。
 */
export function getDisplayUrl(url: string): string {
  try {
    const { host, pathname, search } = new URL(url);
    const path = `${pathname === "/" ? "" : pathname}${search}`;
    return `${host}${safeDecodeURI(path)}`;
  } catch {
    return url;
  }
}

function safeDecodeURI(s: string): string {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
}

/**
 * URL のホストからファビコン画像の URL を生成する。
 * 不正な URL の場合は空文字を返す。
 */
export function getFaviconUrl(url: string, size = 64): string {
  const host = getDomain(url);
  if (!host) return "";
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}

export type DomainSegment<T> = {
  domain: string;
  bookmarks: T[];
};

/**
 * `url` を持つ要素の配列を走査し、連続する同一ドメインをセグメントにまとめる。
 * 並び順は変更せず、間に別ドメインが挟まった場合は別セグメントとして扱う。
 */
export function groupByConsecutiveDomain<T extends { url: string }>(
  items: T[],
): DomainSegment<T>[] {
  const segments: DomainSegment<T>[] = [];
  for (const item of items) {
    const domain = getDomain(item.url);
    const last = segments.at(-1);
    if (last && last.domain === domain) {
      last.bookmarks.push(item);
    } else {
      segments.push({ domain, bookmarks: [item] });
    }
  }
  return segments;
}
