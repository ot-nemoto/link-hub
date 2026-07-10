import { z } from "zod";

/**
 * http/https の URL を検証する共有フィールド（必須/形式/スキームの 3 メッセージ）。
 * ブックマークの `url` と OGP 取得の `url` クエリで共有する。
 */
export const httpUrlField = z.string({ error: "url は必須です" }).superRefine((val, ctx) => {
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

/**
 * 並び替え（reorder）の body スキーマ（ブックマーク・カテゴリ共通）。
 * 第2引数の `error` は body 自体が非オブジェクトのときのメッセージ。
 */
export const reorderBodySchema = z.object(
  {
    ids: z
      .array(z.string({ error: "ids は文字列の配列で指定してください" }), {
        error: "ids は文字列の配列で指定してください",
      })
      .min(1, { error: "ids は必須です" }),
  },
  { error: "リクエストボディが不正です" },
);
