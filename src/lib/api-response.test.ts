// @vitest-environment node
import { describe, expect, it } from "vitest";

import { jsonError, serializeBookmark, statusForError, unauthorized } from "./api-response";

const base = {
  id: "bm_1",
  url: "https://example.com",
  title: "Example",
  memo: "メモ",
  ogImage: "https://example.com/og.png",
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
};

describe("serializeBookmark", () => {
  it("正常系: tag を category に変換し createdAt を ISO 文字列で返す", () => {
    const result = serializeBookmark({ ...base, tag: { id: "t1", name: "Cat" } });

    expect(result).toEqual({
      id: "bm_1",
      url: "https://example.com",
      title: "Example",
      memo: "メモ",
      ogImage: "https://example.com/og.png",
      category: { id: "t1", name: "Cat" },
      createdAt: "2026-01-02T03:04:05.000Z",
    });
  });

  it("tag が null の場合は category: null", () => {
    const result = serializeBookmark({ ...base, memo: null, ogImage: null, tag: null });

    expect(result.category).toBeNull();
    expect(result.memo).toBeNull();
    expect(result.ogImage).toBeNull();
  });
});

describe("statusForError", () => {
  it("「権限がありません」は 403", () => {
    expect(statusForError("権限がありません")).toBe(403);
  });

  it("「見つかりません」を含む場合は 404", () => {
    expect(statusForError("ブックマークが見つかりません")).toBe(404);
    expect(statusForError("カテゴリが見つかりません")).toBe(404);
  });

  it("それ以外は 400", () => {
    expect(statusForError("タグ名が不正です")).toBe(400);
  });
});

describe("jsonError / unauthorized", () => {
  it("jsonError は指定 status と error ボディを返す", async () => {
    const res = jsonError("だめ", 400);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "だめ" });
  });

  it("unauthorized は 401 / Unauthorized", async () => {
    const res = unauthorized();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});
