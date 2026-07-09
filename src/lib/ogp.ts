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

/**
 * 指定 URL の OGP メタデータ（title / image）を取得する。認証は含まない（呼び出し側で行う）。
 * SSRF 遮断・取得失敗・タイムアウト時は `{ error }` を返す。
 */
export async function fetchOgpData(
  url: string,
): Promise<{ title?: string; image?: string; error?: string }> {
  if (!isAllowedUrl(url)) return { error: "取得できませんでした" };
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; link-hub-bot/1.0)" },
    });
    if (!res.ok) return { error: "取得できませんでした" };

    const buffer = await res.arrayBuffer();
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
    let image: string | undefined;
    if (rawImage) {
      image = rawImage.startsWith("http") ? rawImage : new URL(rawImage, url).href;
    }

    return { title, image };
  } catch {
    return { error: "取得できませんでした" };
  }
}
