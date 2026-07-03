import type { Bookmark } from "@/app/(dashboard)/bookmarks/types";

/**
 * URL からドメイン（hostname）を抽出する。
 * 不正な URL の場合は空文字を返す。
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export type DomainSegment = {
  domain: string;
  bookmarks: Bookmark[];
};

/**
 * ブックマーク配列を走査し、連続する同一ドメインをセグメントにまとめる。
 * 並び順は変更せず、間に別ドメインが挟まった場合は別セグメントとして扱う。
 */
export function groupByConsecutiveDomain(bookmarks: Bookmark[]): DomainSegment[] {
  const segments: DomainSegment[] = [];
  for (const bm of bookmarks) {
    const domain = getDomain(bm.url);
    const last = segments.at(-1);
    if (last && last.domain === domain) {
      last.bookmarks.push(bm);
    } else {
      segments.push({ domain, bookmarks: [bm] });
    }
  }
  return segments;
}
