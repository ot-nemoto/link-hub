// @vitest-environment node
import { describe, expect, it } from "vitest";

import { toBookmarkData, validateBookmarkInput } from "./bookmark-validation";

describe("validateBookmarkInput", () => {
  it("正常系: url と title が揃っていれば null", () => {
    expect(validateBookmarkInput({ url: "https://example.com", title: "Example" })).toBeNull();
    expect(validateBookmarkInput({ url: "http://example.com", title: "x" })).toBeNull();
  });

  it("url が無い・空・非文字列は url エラー", () => {
    expect(validateBookmarkInput({ title: "x" })).toBe("url は必須です");
    expect(validateBookmarkInput({ url: "  ", title: "x" })).toBe("url は必須です");
    expect(validateBookmarkInput({ url: 123, title: "x" })).toBe("url は必須です");
  });

  it("url の形式が不正なら形式エラー", () => {
    expect(validateBookmarkInput({ url: "not a url", title: "x" })).toBe("url の形式が不正です");
  });

  it("http/https 以外のスキームはスキームエラー", () => {
    expect(validateBookmarkInput({ url: "ftp://example.com", title: "x" })).toBe(
      "url は http または https のみ対応しています",
    );
    expect(validateBookmarkInput({ url: "javascript:alert(1)", title: "x" })).toBe(
      "url は http または https のみ対応しています",
    );
  });

  it("title が無い・空・非文字列は title エラー", () => {
    expect(validateBookmarkInput({ url: "https://example.com" })).toBe("title は必須です");
    expect(validateBookmarkInput({ url: "https://example.com", title: "  " })).toBe(
      "title は必須です",
    );
    expect(validateBookmarkInput({ url: "https://example.com", title: 1 })).toBe(
      "title は必須です",
    );
  });
});

describe("toBookmarkData", () => {
  it("正常系: 各フィールドを BookmarkData に変換する", () => {
    const result = toBookmarkData({
      url: "https://example.com",
      title: "Example",
      memo: "メモ",
      ogImage: "https://example.com/og.png",
      tagId: "tag_1",
      hideOgImage: true,
    });

    expect(result).toEqual({
      url: "https://example.com",
      title: "Example",
      memo: "メモ",
      ogImage: "https://example.com/og.png",
      tagId: "tag_1",
      hideOgImage: true,
    });
  });

  it("省略されたフィールドは undefined / memo は空文字にフォールバック", () => {
    const result = toBookmarkData({ url: "https://example.com", title: "x" });

    expect(result).toEqual({
      url: "https://example.com",
      title: "x",
      memo: "",
      ogImage: undefined,
      tagId: undefined,
      hideOgImage: undefined,
    });
  });

  it("tagId に null を明示した場合は null（未分類化）を保持する", () => {
    const result = toBookmarkData({ url: "https://example.com", title: "x", tagId: null });

    expect(result.tagId).toBeNull();
  });
});
