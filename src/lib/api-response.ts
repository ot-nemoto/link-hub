import { NextResponse } from "next/server";

type SerializableBookmark = {
  id: string;
  url: string;
  title: string;
  memo: string | null;
  ogImage: string | null;
  createdAt: Date;
  tag: { id: string; name: string } | null;
};

/** ブックマークを外部 API レスポンス形式（camelCase / createdAt は ISO / tag）に整形する。 */
export function serializeBookmark(b: SerializableBookmark) {
  return {
    id: b.id,
    url: b.url,
    title: b.title,
    memo: b.memo,
    ogImage: b.ogImage,
    tag: b.tag ? { id: b.tag.id, name: b.tag.name } : null,
    createdAt: b.createdAt.toISOString(),
  };
}

/** lib が返すエラーメッセージを HTTP ステータスにマッピングする。 */
export function statusForError(message: string): number {
  if (message.includes("権限がありません")) return 403;
  if (message.includes("見つかりません")) return 404;
  return 400;
}

/** `{ error }` ボディ付きのエラーレスポンスを返す。 */
export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** 認証失敗（401）レスポンス。 */
export function unauthorized() {
  return jsonError("Unauthorized", 401);
}
