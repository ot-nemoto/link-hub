import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getBookmarks } from "@/lib/bookmarks";
import { getTags } from "@/lib/tags";
import { BookmarkList } from "./BookmarkList";

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [bookmarks, tags] = await Promise.all([
    getBookmarks(session.user.id, query || undefined),
    getTags(session.user.id),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">ブックマーク一覧</h2>
        <div className="flex gap-2">
          <Link
            href="/bookmarks/tags"
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            タグ管理
          </Link>
          <Link
            href="/bookmarks/new"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            追加
          </Link>
        </div>
      </div>

      <form method="get" className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="タイトル・URL・メモで検索"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
        />
      </form>

      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
          {query ? "該当するブックマークがありません" : "まだブックマークがありません"}
        </div>
      ) : (
        <BookmarkList key={query} bookmarks={bookmarks} isSearching={!!query} allTags={tags} />
      )}
    </div>
  );
}
