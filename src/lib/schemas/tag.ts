import { z } from "zod";

/**
 * タグの作成（POST）・更新（PATCH）共通の body スキーマ。
 * route の責務は「`name` が文字列か」の検証のみ。
 * 空・50字超・trim・重複(409) の判定は lib（`createTag`/`updateTag`）が担う。
 */
export const tagBodySchema = z.object(
  { name: z.string({ error: "name は必須です" }) },
  { error: "リクエストボディが不正です" },
);

/** タグのレスポンス形式（`?withCount=true` 時のみ `bookmarkCount`）。 */
export const tagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  bookmarkCount: z.number().int().optional(),
});
