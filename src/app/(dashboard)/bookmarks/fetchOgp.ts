"use server";

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

function isAllowedUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const hostname = parsed.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return false;
  if (
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname)
  )
    return false;
  return true;
}

export async function fetchOgp(
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
