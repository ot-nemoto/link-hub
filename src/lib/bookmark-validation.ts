import type { BookmarkData } from "@/lib/bookmarks";

/**
 * 外部 API のリクエストボディを検証する。信頼できるクライアントがいないため、
 * UI 側で行っている検証と同等の内容をサーバー側でも行う。
 * 問題なければ null、不正なら日本語のエラーメッセージを返す。
 */
export function validateBookmarkInput(body: {
  url?: unknown;
  title?: unknown;
  tagId?: unknown;
  sortOrder?: unknown;
}): string | null {
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

  // tagId は string（カテゴリ ID）または null（未分類）のみ許可。
  // 非文字列を許すと Prisma に渡って実行時例外→500 になるため 400 で弾く。
  if ("tagId" in body && body.tagId !== null && typeof body.tagId !== "string") {
    return "tagId の形式が不正です";
  }

  // sortOrder は 0〜Int32 上限の整数のみ許可（DB は 32bit Int）。
  // 非整数・範囲外は Prisma 実行時例外→500 になるため弾く。
  if (
    "sortOrder" in body &&
    (typeof body.sortOrder !== "number" ||
      !Number.isInteger(body.sortOrder) ||
      body.sortOrder < 0 ||
      body.sortOrder > 2147483647)
  ) {
    return "sortOrder は 0 以上 2147483647 以下の整数で指定してください";
  }

  return null;
}

/**
 * 検証済みリクエストボディを lib の BookmarkData に変換する。
 * 各フィールドはキーの有無で「更新しない(undefined)」と「クリアする(null/"")」を区別する
 * （`memo`/`ogImage` は空文字でクリア、`tagId` は null で未分類化）。
 */
export function toBookmarkData(body: Record<string, unknown>): BookmarkData {
  return {
    url: body.url as string,
    title: body.title as string,
    memo: "memo" in body ? (typeof body.memo === "string" ? body.memo : "") : undefined,
    ogImage: typeof body.ogImage === "string" ? body.ogImage : undefined,
    tagId: "tagId" in body ? (body.tagId as string | null) : undefined,
    hideOgImage: typeof body.hideOgImage === "boolean" ? body.hideOgImage : undefined,
    sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
  };
}
