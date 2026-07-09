// @vitest-environment node
import { describe, expect, it } from "vitest";

import { firstZodError } from "./_zod-error";
import { bookmarkBodySchema, reorderBodySchema } from "./bookmark";

/** safeParse して先頭エラーメッセージ（成功時 null）を返すヘルパー。 */
function parseError(schema: typeof bookmarkBodySchema, input: unknown): string | null {
  const r = schema.safeParse(input);
  return r.success ? null : firstZodError(r.error);
}

describe("bookmarkBodySchema", () => {
  it("正常系: 必須のみで通過し、値をそのまま返す", () => {
    const r = bookmarkBodySchema.safeParse({ url: "https://example.com", title: "Example" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ url: "https://example.com", title: "Example" });
  });

  it("正常系: 全フィールド（tagId:null / sortOrder:0 含む）", () => {
    const r = bookmarkBodySchema.safeParse({
      url: "https://example.com",
      title: "Example",
      memo: "メモ",
      ogImage: "https://example.com/og.png",
      tagId: null,
      hideOgImage: true,
      sortOrder: 0,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tagId).toBeNull();
  });

  it("url が無い・空・非文字列は url エラー", () => {
    expect(parseError(bookmarkBodySchema, { title: "x" })).toBe("url は必須です");
    expect(parseError(bookmarkBodySchema, { url: "  ", title: "x" })).toBe("url は必須です");
    expect(parseError(bookmarkBodySchema, { url: 123, title: "x" })).toBe("url は必須です");
  });

  it("url の形式が不正なら形式エラー", () => {
    expect(parseError(bookmarkBodySchema, { url: "not a url", title: "x" })).toBe(
      "url の形式が不正です",
    );
  });

  it("http/https 以外のスキームはスキームエラー", () => {
    expect(parseError(bookmarkBodySchema, { url: "ftp://example.com", title: "x" })).toBe(
      "url は http または https のみ対応しています",
    );
    expect(parseError(bookmarkBodySchema, { url: "javascript:alert(1)", title: "x" })).toBe(
      "url は http または https のみ対応しています",
    );
  });

  it("title が無い・空・非文字列は title エラー", () => {
    expect(parseError(bookmarkBodySchema, { url: "https://example.com" })).toBe("title は必須です");
    expect(parseError(bookmarkBodySchema, { url: "https://example.com", title: "  " })).toBe(
      "title は必須です",
    );
    expect(parseError(bookmarkBodySchema, { url: "https://example.com", title: 1 })).toBe(
      "title は必須です",
    );
  });

  it("tagId は string / null / 省略で通過、非文字列はエラー", () => {
    expect(
      parseError(bookmarkBodySchema, { url: "https://a.com", title: "x", tagId: "t1" }),
    ).toBeNull();
    expect(
      parseError(bookmarkBodySchema, { url: "https://a.com", title: "x", tagId: null }),
    ).toBeNull();
    expect(parseError(bookmarkBodySchema, { url: "https://a.com", title: "x", tagId: 123 })).toBe(
      "tagId の形式が不正です",
    );
  });

  it("sortOrder は 0〜2147483647 の整数のみ通過", () => {
    expect(
      parseError(bookmarkBodySchema, { url: "https://a.com", title: "x", sortOrder: 2147483647 }),
    ).toBeNull();
    const msg = "sortOrder は 0 以上 2147483647 以下の整数で指定してください";
    expect(
      parseError(bookmarkBodySchema, { url: "https://a.com", title: "x", sortOrder: "1" }),
    ).toBe(msg);
    expect(
      parseError(bookmarkBodySchema, { url: "https://a.com", title: "x", sortOrder: 1.5 }),
    ).toBe(msg);
    expect(
      parseError(bookmarkBodySchema, { url: "https://a.com", title: "x", sortOrder: -1 }),
    ).toBe(msg);
    expect(
      parseError(bookmarkBodySchema, { url: "https://a.com", title: "x", sortOrder: 2147483648 }),
    ).toBe(msg);
  });

  it("memo / ogImage / hideOgImage は型不正だとエラー（Zod による厳格化）", () => {
    expect(parseError(bookmarkBodySchema, { url: "https://a.com", title: "x", memo: 1 })).toBe(
      "memo は文字列で指定してください",
    );
    expect(
      parseError(bookmarkBodySchema, { url: "https://a.com", title: "x", hideOgImage: "yes" }),
    ).toBe("hideOgImage は真偽値で指定してください");
  });

  it("未知のキーは無視される（strip）", () => {
    const r = bookmarkBodySchema.safeParse({ url: "https://a.com", title: "x", extra: "ignored" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).not.toHaveProperty("extra");
  });

  it("body が非オブジェクト（配列・文字列・数値・null）はボディ不正の日本語エラー", () => {
    for (const v of [[1, 2, 3], "x", 42, null]) {
      expect(parseError(bookmarkBodySchema, v)).toBe("リクエストボディが不正です");
    }
  });
});

describe("reorderBodySchema", () => {
  it("正常系: 文字列配列で通過", () => {
    expect(reorderBodySchema.safeParse({ ids: ["a", "b"] }).success).toBe(true);
  });

  it("配列でない・非文字列要素は配列エラー", () => {
    const msg = "ids は文字列の配列で指定してください";
    const e1 = reorderBodySchema.safeParse({ ids: "a,b" });
    expect(!e1.success && firstZodError(e1.error)).toBe(msg);
    const e2 = reorderBodySchema.safeParse({ ids: ["a", 1] });
    expect(!e2.success && firstZodError(e2.error)).toBe(msg);
  });

  it("空配列・ids 欠落は必須エラー", () => {
    const e1 = reorderBodySchema.safeParse({ ids: [] });
    expect(!e1.success && firstZodError(e1.error)).toBe("ids は必須です");
    const e2 = reorderBodySchema.safeParse({});
    expect(!e2.success && firstZodError(e2.error)).toBe("ids は文字列の配列で指定してください");
  });

  it("body が非オブジェクト（配列・文字列・数値・null）はボディ不正の日本語エラー", () => {
    for (const v of [[], "x", 42, null]) {
      const r = reorderBodySchema.safeParse(v);
      expect(!r.success && firstZodError(r.error)).toBe("リクエストボディが不正です");
    }
  });
});
