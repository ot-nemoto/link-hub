import type { Metadata } from "next";
import Link from "next/link";
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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900">ブックマーク一覧</h2>
        <div className="flex gap-2">
          <Link
            href="/bookmarks/new"
            className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            追加
          </Link>
        </div>
      </div>

      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-500">
          まだブックマークがありません
        </div>
      ) : (
        <BookmarkList bookmarks={bookmarks} allTags={tags} tagsWithCount={tagsWithCount} />
      )}
    </div>
  );
}
