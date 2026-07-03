import { describe, expect, it } from "vitest";
import type { Bookmark } from "@/app/(dashboard)/bookmarks/types";
import { getDomain, groupByConsecutiveDomain } from "./domain-groups";

function bm(id: string, url: string): Bookmark {
  return {
    id,
    url,
    title: id,
    memo: null,
    ogImage: null,
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
