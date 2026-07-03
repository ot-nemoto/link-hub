import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "ブックマーク一覧" };

import { getSession } from "@/lib/auth";
import { getBookmarks } from "@/lib/bookmarks";
import { COLLAPSED_COOKIE_NAME, parseCollapsedCookie } from "@/lib/collapsed-cookie";
import { getTags, getTagsWithCount } from "@/lib/tags";
import { BookmarkList } from "./BookmarkList";

export default async function BookmarksPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const [bookmarks, tags, tagsWithCount, cookieStore] = await Promise.all([
    getBookmarks(session.user.id),
    getTags(session.user.id),
    getTagsWithCount(session.user.id),
    cookies(),
  ]);

  const initialCollapsed = parseCollapsedCookie(cookieStore.get(COLLAPSED_COOKIE_NAME)?.value);

  return (
    <div>
      <BookmarkList
        bookmarks={bookmarks}
        allTags={tags}
        tagsWithCount={tagsWithCount}
        initialCollapsed={initialCollapsed}
      />
    </div>
  );
}
