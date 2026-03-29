import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TagsClient } from "./TagsClient";

export default async function TagsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const rawTags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { bookmarks: true } } },
  });

  const tags = rawTags.map(({ _count, ...tag }) => ({
    ...tag,
    bookmarkCount: _count.bookmarks,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">タグ管理</h2>
        <Link
          href="/bookmarks"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← ブックマーク一覧へ
        </Link>
      </div>

      <TagsClient initialTags={tags} />
    </div>
  );
}
