import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookmarkList } from "./BookmarkList";
import { LIMIT_OPTIONS } from "./constants";
import { LimitSelect } from "./LimitSelect";
import { SortSelect } from "./SortSelect";

const DEFAULT_PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "新しい順" },
  { value: "createdAt_asc", label: "古い順" },
  { value: "title_asc", label: "タイトル昇順" },
  { value: "title_desc", label: "タイトル降順" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function toOrderBy(sort: SortValue) {
  switch (sort) {
    case "createdAt_asc":
      return [{ createdAt: "asc" as const }, { id: "asc" as const }];
    case "title_asc":
      return [{ title: "asc" as const }, { id: "asc" as const }];
    case "title_desc":
      return [{ title: "desc" as const }, { id: "desc" as const }];
    default:
      return [{ createdAt: "desc" as const }, { id: "desc" as const }];
  }
}

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; limit?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { q, page: pageParam, sort: sortParam, limit: limitParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);
  const sort = (
    SORT_OPTIONS.some((o) => o.value === sortParam) ? sortParam : "createdAt_desc"
  ) as SortValue;
  const limitNum = Number(limitParam);
  const pageSize = (LIMIT_OPTIONS as readonly number[]).includes(limitNum)
    ? limitNum
    : DEFAULT_PAGE_SIZE;

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
      orderBy: toOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bookmark.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">ブックマーク一覧</h2>
        <Link
          href="/bookmarks/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          追加
        </Link>
      </div>

      <form method="get" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="タイトル・URL・メモで検索"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
        />
        <SortSelect name="sort" defaultValue={sort} options={[...SORT_OPTIONS]} />
        <LimitSelect name="limit" defaultValue={pageSize} />
      </form>

      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
          {query ? "該当するブックマークがありません" : "まだブックマークがありません"}
        </div>
      ) : (
        <BookmarkList key={`${page}-${sort}-${query}-${pageSize}`} bookmarks={bookmarks} />
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={`?${new URLSearchParams({ ...(query && { q: query }), sort, limit: String(pageSize), page: String(page - 1) })}`}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              前へ
            </Link>
          ) : (
            <span className="rounded border border-gray-200 px-4 py-2 text-sm text-gray-300 dark:border-gray-700 dark:text-gray-600">
              前へ
            </span>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {page} / {totalPages} ページ
          </span>
          {page < totalPages ? (
            <Link
              href={`?${new URLSearchParams({ ...(query && { q: query }), sort, limit: String(pageSize), page: String(page + 1) })}`}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              次へ
            </Link>
          ) : (
            <span className="rounded border border-gray-200 px-4 py-2 text-sm text-gray-300 dark:border-gray-700 dark:text-gray-600">
              次へ
            </span>
          )}
        </div>
      )}
    </div>
  );
}
