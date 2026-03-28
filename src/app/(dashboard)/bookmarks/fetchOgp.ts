"use server";

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

    const html = await res.text();

    const getMetaContent = (property: string) =>
      html.match(
        new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
      )?.[1] ??
      html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
      )?.[1];

    const title =
      getMetaContent("og:title") ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

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
