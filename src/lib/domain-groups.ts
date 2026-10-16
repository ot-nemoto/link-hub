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

/**
 * 一覧の URL 行に表示する文字列を返す（ホスト名 + パス + クエリ）。
 * スキームとフラグメントは含めず、トップページ（パスが "/" のみ）は末尾の "/" を省く。
 * パス・クエリのパーセントエンコードは日本語などが読めるようデコードする
 * （decodeURI は "/" "?" "&" 等の予約文字は復号しないため構造は崩れない。不正なシーケンスはそのまま）。
 * 不正な URL の場合は入力をそのまま返す。
 */
export function getDisplayUrl(url: string): string {
  try {
    const { host, pathname, search } = new URL(url);
    const path = `${pathname === "/" ? "" : pathname}${search}`;
    return `${host}${safeDecodeURI(path)}`;
  } catch {
    return url;
  }
}

function safeDecodeURI(s: string): string {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
}

/**
 * URL のホストからファビコン画像の URL を生成する。
 * 不正な URL の場合は空文字を返す。
 */
export function getFaviconUrl(url: string, size = 64): string {
  const host = getDomain(url);
  if (!host) return "";
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}

function isHttpUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 一覧に表示するファビコン URL の候補を、試す順に返す。
 * 保存済みの `favicon`（ブックマーク先から取得した URL）が http/https であれば先頭に置き、
 * 次に Google のファビコンサービスを置く。表示側は読み込みに失敗したら次の候補を試す
 * （ホットリンク禁止・混在コンテンツ・リンク切れで保存済み URL が読めない場合に Google で補うため）。
 * 不正な値・空の候補は含めない。
 */
export function getFaviconCandidates(url: string, favicon?: string | null, size = 64): string[] {
  const candidates: string[] = [];
  if (favicon && isHttpUrl(favicon)) candidates.push(favicon);
  const google = getFaviconUrl(url, size);
  if (google && !candidates.includes(google)) candidates.push(google);
  return candidates;
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
