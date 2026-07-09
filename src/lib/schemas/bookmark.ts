import { z } from "zod";

const SORT_ORDER_MSG = "sortOrder は 0 以上 2147483647 以下の整数で指定してください";

const urlField = z.string({ error: "url は必須です" }).superRefine((val, ctx) => {
  if (val.trim() === "") {
    ctx.addIssue({ code: "custom", message: "url は必須です" });
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(val);
  } catch {
    ctx.addIssue({ code: "custom", message: "url の形式が不正です" });
    return;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    ctx.addIssue({ code: "custom", message: "url は http または https のみ対応しています" });
  }
});

const titleField = z
  .string({ error: "title は必須です" })
  .refine((v) => v.trim() !== "", { error: "title は必須です" });

/**
 * ブックマークの作成・更新（PATCH）共通の body スキーマ。
 * `url`・`title` は必須。それ以外はキー省略で保持、明示送信で更新（部分更新）。
 * `tagId` は `null` で未分類化、`sortOrder` は 0〜Int32 上限の整数。
 */
export const bookmarkBodySchema = z.object({
  url: urlField,
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
});

export type BookmarkBody = z.infer<typeof bookmarkBodySchema>;

/** 並び替え（reorder）の body スキーマ。 */
export const reorderBodySchema = z.object({
  ids: z
    .array(z.string({ error: "ids は文字列の配列で指定してください" }), {
      error: "ids は文字列の配列で指定してください",
    })
    .min(1, { error: "ids は必須です" }),
});
