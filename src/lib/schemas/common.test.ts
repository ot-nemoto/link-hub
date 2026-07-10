// @vitest-environment node
import { describe, expect, it } from "vitest";

import { firstZodError } from "./_zod-error";
import { httpUrlField, reorderBodySchema } from "./common";

function urlError(input: unknown): string | null {
  const r = httpUrlField.safeParse(input);
  return r.success ? null : firstZodError(r.error);
}

function reorderError(input: unknown): string | null {
  const r = reorderBodySchema.safeParse(input);
  return r.success ? null : firstZodError(r.error);
}

describe("httpUrlField", () => {
  it("http/https の URL は通過", () => {
    expect(urlError("https://example.com")).toBeNull();
    expect(urlError("http://example.com/path")).toBeNull();
  });

  it("無い・空・非文字列は必須エラー", () => {
    expect(urlError(undefined)).toBe("url は必須です");
    expect(urlError(null)).toBe("url は必須です");
    expect(urlError("  ")).toBe("url は必須です");
    expect(urlError(123)).toBe("url は必須です");
  });

  it("形式不正・非 http/https はそれぞれのエラー", () => {
    expect(urlError("not a url")).toBe("url の形式が不正です");
    expect(urlError("ftp://example.com")).toBe("url は http または https のみ対応しています");
  });
});

describe("reorderBodySchema", () => {
  it("正常系: 文字列配列で通過", () => {
    expect(reorderBodySchema.safeParse({ ids: ["a", "b"] }).success).toBe(true);
  });

  it("配列でない・非文字列要素は配列エラー", () => {
    expect(reorderError({ ids: "a,b" })).toBe("ids は文字列の配列で指定してください");
    expect(reorderError({ ids: ["a", 1] })).toBe("ids は文字列の配列で指定してください");
  });

  it("空配列・ids 欠落は必須／配列エラー", () => {
    expect(reorderError({ ids: [] })).toBe("ids は必須です");
    expect(reorderError({})).toBe("ids は文字列の配列で指定してください");
  });

  it("body が非オブジェクト（配列・文字列・数値・null）はボディ不正の日本語エラー", () => {
    for (const v of [[], "x", 42, null]) {
      expect(reorderError(v)).toBe("リクエストボディが不正です");
    }
  });
});
