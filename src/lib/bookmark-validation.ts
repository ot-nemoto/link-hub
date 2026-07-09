import type { BookmarkData } from "@/lib/bookmarks";

/**
 * 外部 API のリクエストボディを検証する。信頼できるクライアントがいないため、
 * UI 側で行っている検証と同等の内容をサーバー側でも行う。
 * 問題なければ null、不正なら日本語のエラーメッセージを返す。
 */
export function validateBookmarkInput(body: { url?: unknown; title?: unknown }): string | null {
  if (typeof body.url !== "string" || body.url.trim() === "") {
    return "url は必須です";
  }

  let parsed: URL;
  try {
    parsed = new URL(body.url);
  } catch {
    return "url の形式が不正です";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "url は http または https のみ対応しています";
  }

  if (typeof body.title !== "string" || body.title.trim() === "") {
    return "title は必須です";
  }

  return null;
}

/**
 * 検証済みリクエストボディを lib の BookmarkData に変換する。
 * `tagId` / `ogImage` はキーの有無で「更新しない(undefined)」と「クリアする(null/"")」を区別する。
 */
export function toBookmarkData(body: Record<string, unknown>): BookmarkData {
  return {
    url: body.url as string,
    title: body.title as string,
    memo: typeof body.memo === "string" ? body.memo : "",
    ogImage: typeof body.ogImage === "string" ? body.ogImage : undefined,
    tagId: "tagId" in body ? (body.tagId as string | null) : undefined,
    hideOgImage: typeof body.hideOgImage === "boolean" ? body.hideOgImage : undefined,
  };
}
