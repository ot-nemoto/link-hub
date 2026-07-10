// @vitest-environment node
import { describe, expect, it } from "vitest";

import { firstZodError } from "./_zod-error";
import { tagBodySchema } from "./tag";

function parseError(input: unknown): string | null {
  const r = tagBodySchema.safeParse(input);
  return r.success ? null : firstZodError(r.error);
}

describe("tagBodySchema", () => {
  it("正常系: name が文字列なら通過", () => {
    const r = tagBodySchema.safeParse({ name: "React" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.name).toBe("React");
  });

  it("name が無い・非文字列は name エラー（空/50字超の判定は lib）", () => {
    expect(parseError({})).toBe("name は必須です");
    expect(parseError({ name: 123 })).toBe("name は必須です");
  });

  it("空文字は通過する（空/trim/50字超は lib で判定）", () => {
    expect(parseError({ name: "" })).toBeNull();
  });

  it("未知のキーは無視される（strip）", () => {
    const r = tagBodySchema.safeParse({ name: "React", extra: "x" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).not.toHaveProperty("extra");
  });

  it("body が非オブジェクト（配列・文字列・数値・null）はボディ不正の日本語エラー", () => {
    for (const v of [[1], "x", 42, null]) {
      expect(parseError(v)).toBe("リクエストボディが不正です");
    }
  });
});
