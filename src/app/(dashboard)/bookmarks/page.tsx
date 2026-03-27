import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "./DeleteButton";

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const bookmarks = await prisma.bookmark.findMany({
    where: {
      userId: session.user.id,
      ...(query && {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { url: { contains: query, mode: "insensitive" } },
          { memo: { contains: query, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
  });

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
        <ul className="space-y-3">
          {bookmarks.map((bm) => (
            <li key={bm.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <a
                    href={bm.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {bm.title}
                  </a>
                  <p className="mt-0.5 truncate text-sm text-gray-500">{bm.url}</p>
                  {bm.memo && <p className="mt-1 text-sm text-gray-700">{bm.memo}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/bookmarks/${bm.id}/edit`}
                    className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    編集
                  </Link>
                  <DeleteButton id={bm.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
