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

  it("tagId が string / null / 省略なら通過する", () => {
    expect(
      validateBookmarkInput({ url: "https://example.com", title: "x", tagId: "tag_1" }),
    ).toBeNull();
    expect(
      validateBookmarkInput({ url: "https://example.com", title: "x", tagId: null }),
    ).toBeNull();
    expect(validateBookmarkInput({ url: "https://example.com", title: "x" })).toBeNull();
  });

  it("tagId が非文字列（数値・配列・オブジェクト）は 400 相当のエラー", () => {
    const msg = "tagId の形式が不正です";
    expect(validateBookmarkInput({ url: "https://example.com", title: "x", tagId: 123 })).toBe(msg);
    expect(validateBookmarkInput({ url: "https://example.com", title: "x", tagId: ["a"] })).toBe(
      msg,
    );
    expect(validateBookmarkInput({ url: "https://example.com", title: "x", tagId: {} })).toBe(msg);
  });

  it("sortOrder が範囲内の整数 / 省略なら通過する", () => {
    expect(
      validateBookmarkInput({ url: "https://example.com", title: "x", sortOrder: 0 }),
    ).toBeNull();
    expect(
      validateBookmarkInput({ url: "https://example.com", title: "x", sortOrder: 2147483647 }),
    ).toBeNull();
    expect(validateBookmarkInput({ url: "https://example.com", title: "x" })).toBeNull();
  });

  it("sortOrder が整数以外・範囲外は 400 相当のエラー", () => {
    const msg = "sortOrder は 0 以上 2147483647 以下の整数で指定してください";
    expect(validateBookmarkInput({ url: "https://example.com", title: "x", sortOrder: "1" })).toBe(
      msg,
    );
    expect(validateBookmarkInput({ url: "https://example.com", title: "x", sortOrder: 1.5 })).toBe(
      msg,
    );
    expect(validateBookmarkInput({ url: "https://example.com", title: "x", sortOrder: -1 })).toBe(
      msg,
    );
    expect(
      validateBookmarkInput({ url: "https://example.com", title: "x", sortOrder: 2147483648 }),
    ).toBe(msg);
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
      sortOrder: 3,
    });

    expect(result).toEqual({
      url: "https://example.com",
      title: "Example",
      memo: "メモ",
      ogImage: "https://example.com/og.png",
      tagId: "tag_1",
      hideOgImage: true,
      sortOrder: 3,
    });
  });

  it("省略されたフィールドはすべて undefined（更新しない意図）", () => {
    const result = toBookmarkData({ url: "https://example.com", title: "x" });

    expect(result).toEqual({
      url: "https://example.com",
      title: "x",
      memo: undefined,
      ogImage: undefined,
      tagId: undefined,
      hideOgImage: undefined,
    });
  });

  it("memo に空文字を明示した場合は空文字（＝クリア）を保持する", () => {
    const result = toBookmarkData({ url: "https://example.com", title: "x", memo: "" });

    expect(result.memo).toBe("");
  });

  it("tagId に null を明示した場合は null（未分類化）を保持する", () => {
    const result = toBookmarkData({ url: "https://example.com", title: "x", tagId: null });

    expect(result.tagId).toBeNull();
  });
});
