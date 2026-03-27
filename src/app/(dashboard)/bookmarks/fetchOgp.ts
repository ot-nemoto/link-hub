"use server";

export async function fetchOgp(
  url: string,
): Promise<{ title?: string; image?: string; error?: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
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
      image = rawImage.startsWith("http") ? rawImage : new URL(rawImage, new URL(url).origin).href;
    }

    return { title, image };
  } catch {
    return { error: "取得できませんでした" };
  }
}
