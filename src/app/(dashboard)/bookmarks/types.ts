export const UNCATEGORIZED_KEY = "__uncategorized__";

export type Bookmark = {
  id: string;
  url: string;
  title: string;
  memo: string | null;
  ogImage: string | null;
  hideOgImage: boolean;
  sortOrder: number;
  tag: { id: string; name: string } | null;
  tagId: string | null;
};

export type TagItem = { id: string; name: string };
export type TagWithCount = { id: string; name: string; bookmarkCount: number };
