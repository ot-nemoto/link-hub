// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { firstZodError } from "./_zod-error";

describe("firstZodError", () => {
  it("issues がある場合は先頭 issue のメッセージを返す", () => {
    const result = z
      .object({ a: z.string({ error: "a エラー" }), b: z.string({ error: "b エラー" }) })
      .safeParse({ a: 1, b: 2 });

    expect(result.success).toBe(false);
    if (!result.success) expect(firstZodError(result.error)).toBe("a エラー");
  });

  it("issues が空の場合はフォールバックメッセージを返す", () => {
    expect(firstZodError({ issues: [] } as never)).toBe("リクエストが不正です");
  });
});
