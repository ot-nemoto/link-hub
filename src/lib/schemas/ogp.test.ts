// @vitest-environment node
import { describe, expect, it } from "vitest";

import { firstZodError } from "./_zod-error";
import { ogpQuerySchema } from "./ogp";

function parseError(input: unknown): string | null {
  const r = ogpQuerySchema.safeParse(input);
  return r.success ? null : firstZodError(r.error);
}

describe("ogpQuerySchema", () => {
  it("正常系: http/https の url は通過", () => {
    expect(parseError({ url: "https://example.com" })).toBeNull();
  });

  it("url 未指定（null）・形式不正・非 http/https はエラー", () => {
    // searchParams.get('url') は未指定時 null を返す
    expect(parseError({ url: null })).toBe("url は必須です");
    expect(parseError({ url: "not a url" })).toBe("url の形式が不正です");
    expect(parseError({ url: "ftp://example.com" })).toBe(
      "url は http または https のみ対応しています",
    );
  });
});
