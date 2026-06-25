import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "ブックマーク一覧" };

import { getSession } from "@/lib/auth";
import { getBookmarks } from "@/lib/bookmarks";
import { getTags, getTagsWithCount } from "@/lib/tags";
import { BookmarkList } from "./BookmarkList";

export default async function BookmarksPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const [bookmarks, tags, tagsWithCount] = await Promise.all([
    getBookmarks(session.user.id),
    getTags(session.user.id),
    getTagsWithCount(session.user.id),
  ]);

  return (
    <div>
      <BookmarkList bookmarks={bookmarks} allTags={tags} tagsWithCount={tagsWithCount} />
    </div>
  );
}
