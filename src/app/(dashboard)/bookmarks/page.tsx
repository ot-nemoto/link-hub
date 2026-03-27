import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookmarkList } from "./BookmarkList";

const PAGE_SIZE = 20;

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    userId: session.user.id,
    ...(query && {
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { url: { contains: query, mode: "insensitive" as const } },
        { memo: { contains: query, mode: "insensitive" as const } },
      ],
    }),
  };

  const [bookmarks, total] = await Promise.all([
    prisma.bookmark.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bookmark.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">ブックマーク一覧</h2>
        <Link
          href="/bookmarks/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          追加
        </Link>
      </div>

      <form method="get" className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="タイトル・URL・メモで検索"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </form>

      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center text-gray-500">
          {query ? "該当するブックマークがありません" : "まだブックマークがありません"}
        </div>
      ) : (
        <BookmarkList bookmarks={bookmarks} />
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={`?${new URLSearchParams({ ...(query && { q: query }), page: String(page - 1) })}`}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              前へ
            </Link>
          ) : (
            <span className="rounded border border-gray-200 px-4 py-2 text-sm text-gray-300">前へ</span>
          )}
          <span className="text-sm text-gray-600">
            {page} / {totalPages} ページ
          </span>
          {page < totalPages ? (
            <Link
              href={`?${new URLSearchParams({ ...(query && { q: query }), page: String(page + 1) })}`}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              次へ
            </Link>
          ) : (
            <span className="rounded border border-gray-200 px-4 py-2 text-sm text-gray-300">次へ</span>
          )}
        </div>
      )}
    </div>
  );
}
