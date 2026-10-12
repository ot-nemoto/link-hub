import { unstable_rethrow } from "next/navigation";
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

/** 包まれていることを実行時に判定するための印（route-wrapping.test.ts が参照する） */
export const WRAPPED = Symbol.for("link-hub.withApiErrorHandling");

/**
 * ルートハンドラを包み、捕捉されない例外を `500 { error }` に変換する。
 * lib の `{ error }` はクライアント起因のみで、サーバー起因の失敗は throw される前提。
 * 例外の内容はサーバーログにのみ残し、レスポンスには出さない。
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  const wrapped = async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (e) {
      // redirect() / notFound() 等は例外で制御フローを表現する。先に再 throw しないと
      // 500 に化ける（現時点の API ルートでは未使用だが、後から足した人が気づけない）
      unstable_rethrow(e);
      const req = args[0];
      const where = req instanceof Request ? `${req.method} ${new URL(req.url).pathname}` : "";
      console.error(`[api] 500 ${where}`.trimEnd(), e);
      return jsonError("Internal Server Error", 500);
    }
  };
  // 文字列マッチではなく実体で判定できるようにする。
  // 書き方（export * / 再 export / 別ファイル定義）に依存せず検査できる。
  return Object.defineProperty(wrapped, WRAPPED, { value: true });
}

/** 認証失敗（401）レスポンス。 */
export function unauthorized() {
  return jsonError("Unauthorized", 401);
}
