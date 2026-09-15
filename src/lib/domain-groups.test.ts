// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Bookmark } from "@/app/(dashboard)/bookmarks/types";
import { getDisplayUrl, getDomain, getFaviconUrl, groupByConsecutiveDomain } from "./domain-groups";

function bm(id: string, url: string): Bookmark {
  return {
    id,
    url,
    title: id,
    memo: null,
    ogImage: null,
    hideOgImage: false,
    sortOrder: 0,
    tag: null,
    tagId: null,
  };
}

describe("getDomain", () => {
  it("URL から hostname を抽出する", () => {
    expect(getDomain("https://example.com/path?q=1")).toBe("example.com");
    expect(getDomain("http://sub.example.com/")).toBe("sub.example.com");
  });

  it("不正な URL は空文字を返す", () => {
    expect(getDomain("not-a-url")).toBe("");
    expect(getDomain("")).toBe("");
  });
});

describe("getDisplayUrl", () => {
  it("ホスト名 + パス + クエリを返し、スキームは含めない", () => {
    expect(getDisplayUrl("https://example.com/docs/app?tab=1")).toBe("example.com/docs/app?tab=1");
    expect(getDisplayUrl("http://sub.example.com:8080/a/b")).toBe("sub.example.com:8080/a/b");
  });

  it("トップページは末尾の / を省いてホスト名のみ返す", () => {
    expect(getDisplayUrl("https://example.com")).toBe("example.com");
    expect(getDisplayUrl("https://example.com/")).toBe("example.com");
    expect(getDisplayUrl("https://example.com/?q=1")).toBe("example.com?q=1");
  });

  it("フラグメントは含めない", () => {
    expect(getDisplayUrl("https://example.com/docs#section")).toBe("example.com/docs");
  });

  it("末尾の / があるパスはそのまま返す", () => {
    expect(getDisplayUrl("https://example.com/docs/")).toBe("example.com/docs/");
  });

  it("不正な URL は入力をそのまま返す", () => {
    expect(getDisplayUrl("not-a-url")).toBe("not-a-url");
    expect(getDisplayUrl("")).toBe("");
  });
});

describe("getFaviconUrl", () => {
  it("ホストからファビコン URL を生成する", () => {
    expect(getFaviconUrl("https://example.com/path")).toBe(
      "https://www.google.com/s2/favicons?domain=example.com&sz=64",
    );
  });

  it("size を指定できる", () => {
    expect(getFaviconUrl("https://example.com", 32)).toBe(
      "https://www.google.com/s2/favicons?domain=example.com&sz=32",
    );
  });

  it("IPv6 リテラルホストのブラケットをエンコードする", () => {
    expect(getFaviconUrl("http://[::1]/")).toBe(
      "https://www.google.com/s2/favicons?domain=%5B%3A%3A1%5D&sz=64",
    );
  });

  it("不正な URL は空文字を返す", () => {
    expect(getFaviconUrl("not-a-url")).toBe("");
    expect(getFaviconUrl("")).toBe("");
  });
});

describe("groupByConsecutiveDomain", () => {
  it("連続する同一ドメインを1セグメントにまとめる", () => {
    const segments = groupByConsecutiveDomain([
      bm("1", "https://a.com/1"),
      bm("2", "https://a.com/2"),
      bm("3", "https://b.com/1"),
    ]);
    expect(segments).toHaveLength(2);
    expect(segments[0].domain).toBe("a.com");
    expect(segments[0].bookmarks.map((b) => b.id)).toEqual(["1", "2"]);
    expect(segments[1].domain).toBe("b.com");
    expect(segments[1].bookmarks.map((b) => b.id)).toEqual(["3"]);
  });

  it("間に別ドメインが挟まると別セグメントになる", () => {
    const segments = groupByConsecutiveDomain([
      bm("1", "https://a.com/1"),
      bm("2", "https://b.com/1"),
      bm("3", "https://a.com/2"),
    ]);
    expect(segments.map((s) => s.domain)).toEqual(["a.com", "b.com", "a.com"]);
    expect(segments.every((s) => s.bookmarks.length === 1)).toBe(true);
  });

  it("単一ドメインは1件のセグメントになる", () => {
    const segments = groupByConsecutiveDomain([bm("1", "https://a.com/1")]);
    expect(segments).toHaveLength(1);
    expect(segments[0].bookmarks).toHaveLength(1);
  });

  it("空配列は空セグメントを返す", () => {
    expect(groupByConsecutiveDomain([])).toEqual([]);
  });

  it("不正な URL は空ドメイン同士でまとまる", () => {
    const segments = groupByConsecutiveDomain([bm("1", "invalid-1"), bm("2", "invalid-2")]);
    expect(segments).toHaveLength(1);
    expect(segments[0].domain).toBe("");
    expect(segments[0].bookmarks.map((b) => b.id)).toEqual(["1", "2"]);
  });
});
