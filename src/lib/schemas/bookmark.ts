import { z } from "zod";

import { httpUrlField } from "./common";

const SORT_ORDER_MSG = "sortOrder は 0 以上 2147483647 以下の整数で指定してください";

const titleField = z
  .string({ error: "title は必須です" })
  .refine((v) => v.trim() !== "", { error: "title は必須です" });

/**
 * ブックマークの作成・更新（PATCH）共通の body スキーマ。
 * `url`・`title` は必須。それ以外はキー省略で保持、明示送信で更新（部分更新）。
 * `tagId` は `null` で未分類化、`sortOrder` は 0〜Int32 上限の整数。
 * 第2引数の `error` は body 自体が非オブジェクト（配列・文字列・数値・null）のときのメッセージ。
 *
 * NOTE: `sortOrder` は PATCH（更新）用。POST（作成）では `createBookmark` が自前で採番するため無視される。
 */
export const bookmarkBodySchema = z.object(
  {
    url: httpUrlField,
    title: titleField,
    memo: z.string({ error: "memo は文字列で指定してください" }).optional(),
    ogImage: z.string({ error: "ogImage は文字列で指定してください" }).optional(),
    tagId: z.string({ error: "tagId の形式が不正です" }).nullable().optional(),
    hideOgImage: z.boolean({ error: "hideOgImage は真偽値で指定してください" }).optional(),
    sortOrder: z
      .number({ error: SORT_ORDER_MSG })
      .int({ error: SORT_ORDER_MSG })
      .min(0, { error: SORT_ORDER_MSG })
      .max(2147483647, { error: SORT_ORDER_MSG })
      .optional(),
  },
  { error: "リクエストボディが不正です" },
);

export type BookmarkBody = z.infer<typeof bookmarkBodySchema>;

/** ブックマークのレスポンス形式（OpenAPI ドキュメント用）。 */
export const bookmarkResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  memo: z.string().nullable(),
  ogImage: z.string().nullable(),
  tag: z.object({ id: z.string(), name: z.string() }).nullable(),
  createdAt: z.string(),
});

// 並び替え（reorder）の body スキーマは共通のため src/lib/schemas/common.ts に移設。
