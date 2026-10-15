import net from "node:net";

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function normalizeCharset(charset: string): string {
  const normalized = charset.trim().toLowerCase();
  if (normalized === "utf8") return "utf-8";
  if (normalized === "sjis" || normalized === "x-sjis") return "shift_jis";
  return normalized;
}

function detectCharset(buffer: ArrayBuffer, contentType: string | null): string {
  const headerCharset = contentType?.match(/charset=["']?([^"';\s]+)/i)?.[1];
  if (headerCharset) return normalizeCharset(headerCharset);

  // meta タグ判定用に先頭バイトを latin1 でスキャン（ASCII 範囲は文字コードに依らず一致する）
  const head = new TextDecoder("latin1").decode(buffer.slice(0, 4096));
  const metaCharset =
    head.match(/<meta[^>]+charset=["']?([^"'/>\s]+)/i)?.[1] ??
    head.match(/<meta[^>]+content=["'][^"']*charset=([^"';\s]+)/i)?.[1];
  if (metaCharset) return normalizeCharset(metaCharset);

  return "utf-8";
}

function decodeBuffer(buffer: ArrayBuffer, charset: string): string {
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

/** プライベート・ループバック・リンクローカル等の遮断対象 IPv4 か判定する。 */
function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // 異常な形式は安全側に倒して遮断
  }
  const [a, b] = parts;
  return (
    a === 0 || // 0.0.0.0/8（0.0.0.0 含む）
    a === 10 || // 10.0.0.0/8 プライベート
    a === 127 || // ループバック
    (a === 100 && b >= 64 && b <= 127) || // 100.64/10 CGNAT
    (a === 169 && b === 254) || // 169.254/16 リンクローカル（クラウドメタデータ）
    (a === 172 && b >= 16 && b <= 31) || // 172.16/12 プライベート
    (a === 192 && b === 168) // 192.168/16 プライベート
  );
}

/** 遮断対象ホスト（プライベート/ループバック/リンクローカル/ULA/IPv4-mapped 等）か判定する。 */
function isBlockedHostname(hostname: string): boolean {
  // new URL() は IPv6 を [...] で囲むため外す
  const host =
    hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

  if (net.isIPv4(host)) return isBlockedIpv4(host);

  if (net.isIPv6(host)) {
    const v6 = host.toLowerCase();
    if (v6 === "::" || v6 === "::1") return true; // 未指定 / ループバック
    // IPv4-mapped（::ffff:x）: 埋め込まれた IPv4 を取り出して判定する
    const mapped = v6.match(/^::ffff:(.+)$/);
    if (mapped) {
      const rest = mapped[1];
      if (net.isIPv4(rest)) return isBlockedIpv4(rest);
      const hex = rest.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hex) {
        const hi = Number.parseInt(hex[1], 16);
        const lo = Number.parseInt(hex[2], 16);
        return isBlockedIpv4(`${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`);
      }
      return true; // 未知の mapped 形式は遮断
    }
    if (/^fe[89ab]/.test(v6)) return true; // fe80::/10 リンクローカル
    if (/^f[cd]/.test(v6)) return true; // fc00::/7 ULA
    return false;
  }

  // IP リテラルでない（ドメイン名）: localhost 系のみ遮断
  const lower = hostname.toLowerCase();
  return lower === "localhost" || lower.endsWith(".localhost");
}

/** SSRF 対策: http/https のみ許可し、内部ネットワーク宛のホストを遮断する。 */
function isAllowedUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  return !isBlockedHostname(parsed.hostname);
}

/** http/https の URL かどうかのみを判定する（表示用 URL の採用可否チェック用。ホストは問わない）。 */
function isHttpUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

const TIMEOUT_MS = 3000;
const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 300 * 1024; // 300KB（先頭部分のみあれば og:* / <link rel="icon"> は判定できる）
const USER_AGENT = "Mozilla/5.0 (compatible; link-hub-bot/1.0)";
const FAVICON_LINK_REL_PRIORITY = ["icon", "shortcut icon", "apple-touch-icon"];

type RedirectFetchResult = { res: Response; finalUrl: string } | { error: string };

/**
 * リダイレクトを 1 ホップずつ手動で追跡しながら fetch する。
 * 各ホップで `isAllowedUrl()` を検査するため、外部ホストから内部アドレスへのリダイレクトを遮断できる
 * （`fetch` 既定の自動追従では転送先が検査されない）。ホップ数は `MAX_REDIRECTS` まで。
 *
 * `signal` は呼び出し元（`fetchOgpData`）が 1 回だけ生成したものを使い回す。ホップごとに
 * 新しいタイムアウトを割り当てないため、メインページ取得 + `/favicon.ico` フォールバックを
 * 合わせた呼び出し全体が `TIMEOUT_MS` で頭打ちになる（ホップを重ねるほど待てる時間が伸びない）。
 */
async function fetchFollowingRedirects(
  url: string,
  signal: AbortSignal,
): Promise<RedirectFetchResult> {
  let currentUrl = url;
  let redirects = 0;
  while (true) {
    if (!isAllowedUrl(currentUrl)) return { error: "取得できませんでした" };
    let res: Response;
    try {
      res = await fetch(currentUrl, {
        signal,
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT },
      });
    } catch {
      return { error: "取得できませんでした" };
    }
    const location = res.headers.get("location");
    const isRedirect = res.status >= 300 && res.status < 400 && !!location;
    if (!isRedirect) return { res, finalUrl: currentUrl };
    // 次のホップへ進む前に未使用のボディを読み捨てる（undici の接続プールを塞がないため）
    res.body?.cancel().catch(() => {});
    if (redirects >= MAX_REDIRECTS) return { error: "取得できませんでした" };
    redirects++;
    try {
      currentUrl = new URL(location, currentUrl).href;
    } catch {
      return { error: "取得できませんでした" };
    }
  }
}

/**
 * レスポンスボディを `maxBytes` までだけ読み取る。上限超過分は読み捨てて接続を打ち切る
 * （巨大なレスポンスをそのまま最後まで読み込まないためのサイズ上限）。
 */
async function readLimited(res: Response, maxBytes: number): Promise<ArrayBuffer> {
  const reader = res.body?.getReader();
  if (!reader) return res.arrayBuffer();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      const take = value.byteLength - (total - maxBytes);
      if (take > 0) chunks.push(value.subarray(0, take));
      reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
  }

  const size = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

/**
 * 相対/絶対どちらの href も `base` を基準に絶対 URL へ解決する。
 * まず `raw` 単体を絶対 URL として解釈し、それが失敗した場合のみ `base` 相対として解決する
 * （"http" で始まるかどうかの文字列判定だと、たまたま "http" から始まる相対パスを
 * 絶対 URL と誤判定してしまうため）。
 */
function resolveUrl(raw: string, base: string): string | undefined {
  try {
    return new URL(raw).href;
  } catch {
    try {
      return new URL(raw, base).href;
    } catch {
      return undefined;
    }
  }
}

/** `<link>` タグから指定属性の値を取り出す（ダブル/シングルクオート・無クオートのいずれにも対応）。 */
function extractAttr(tag: string, name: string): string | undefined {
  return (
    tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1] ??
    tag.match(new RegExp(`\\b${name}=([^\\s"'>]+)`, "i"))?.[1]
  );
}

/**
 * HTML から favicon の候補 href を抽出する。
 * `<link rel="icon">` → `rel="shortcut icon"` → `rel="apple-touch-icon"` の優先順位で採用し、
 * 同じ rel が複数ある場合は出現順で先頭を採用する。
 */
function extractFaviconHref(html: string): string | undefined {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  const candidates = new Map<string, string>();
  for (const tag of linkTags) {
    const rel = extractAttr(tag, "rel")?.trim().toLowerCase();
    const href = extractAttr(tag, "href");
    if (!rel || !href || candidates.has(rel) || !FAVICON_LINK_REL_PRIORITY.includes(rel)) continue;
    candidates.set(rel, href);
  }
  for (const rel of FAVICON_LINK_REL_PRIORITY) {
    const href = candidates.get(rel);
    if (href) return href;
  }
  return undefined;
}

/**
 * `<link rel="icon">` 系が見つからない場合のフォールバック。
 * `<オリジン>/favicon.ico` を取得し、`Content-Type` が `image/*` の場合だけ URL を採用する
 * （SPA 等では HTML が返ることがあるため）。本文は読み捨て、ヘッダーのみ確認する。
 */
async function fetchFaviconIcoFallback(
  pageUrl: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  let icoUrl: string;
  try {
    icoUrl = new URL("/favicon.ico", pageUrl).href;
  } catch {
    return undefined;
  }

  const result = await fetchFollowingRedirects(icoUrl, signal);
  if ("error" in result) return undefined;

  const { res, finalUrl } = result;
  const isImage = res.ok && (res.headers.get("content-type")?.startsWith("image/") ?? false);
  res.body?.cancel().catch(() => {});
  return isImage ? finalUrl : undefined;
}

/**
 * 指定 URL の OGP メタデータ（title / image）とファビコン URL を取得する。認証は含まない（呼び出し側で行う）。
 * SSRF 遮断・取得失敗・タイムアウト時は `{ error }` を返す。
 */
export async function fetchOgpData(
  url: string,
): Promise<{ title?: string; image?: string; favicon?: string; error?: string }> {
  // メインページ取得〜/favicon.ico フォールバックまで含めた呼び出し全体で 1 つのタイムアウトを共有する
  // （ホップごとに個別のタイムアウトを割り当てると、リダイレクトを重ねるたびに許容時間が延びてしまうため）
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  const fetched = await fetchFollowingRedirects(url, signal);
  if ("error" in fetched) return { error: fetched.error };

  const { res, finalUrl } = fetched;
  if (!res.ok) return { error: "取得できませんでした" };

  try {
    const buffer = await readLimited(res, MAX_HTML_BYTES);
    const charset = detectCharset(buffer, res.headers.get("content-type"));
    const html = decodeBuffer(buffer, charset);

    const getMetaContent = (property: string) =>
      html.match(
        new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
      )?.[1] ??
      html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
      )?.[1];

    const rawTitle =
      getMetaContent("og:title") ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const title = rawTitle ? decodeHtmlEntities(rawTitle) : undefined;

    const rawImage = getMetaContent("og:image");
    const image = rawImage ? resolveUrl(rawImage, finalUrl) : undefined;

    const faviconHref = extractFaviconHref(html);
    const rawFavicon = faviconHref
      ? resolveUrl(faviconHref, finalUrl)
      : await fetchFaviconIcoFallback(finalUrl, signal);
    const favicon = rawFavicon && isHttpUrl(rawFavicon) ? rawFavicon : undefined;

    return { title, image, favicon };
  } catch {
    return { error: "取得できませんでした" };
  }
}
