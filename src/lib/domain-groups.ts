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

export type DomainSegment<T> = {
  domain: string;
  bookmarks: T[];
};

/**
 * `url` を持つ要素の配列を走査し、連続する同一ドメインをセグメントにまとめる。
 * 並び順は変更せず、間に別ドメインが挟まった場合は別セグメントとして扱う。
 */
export function groupByConsecutiveDomain<T extends { url: string }>(
  items: T[],
): DomainSegment<T>[] {
  const segments: DomainSegment<T>[] = [];
  for (const item of items) {
    const domain = getDomain(item.url);
    const last = segments.at(-1);
    if (last && last.domain === domain) {
      last.bookmarks.push(item);
    } else {
      segments.push({ domain, bookmarks: [item] });
    }
  }
  return segments;
}
