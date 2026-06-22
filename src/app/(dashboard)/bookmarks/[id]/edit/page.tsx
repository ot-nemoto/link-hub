import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = { title: "ブックマーク編集" };

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateBookmark } from "../../actions";
import { BookmarkForm } from "../../BookmarkForm";

export default async function EditBookmarkPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const [bookmark, tags] = await Promise.all([
    prisma.bookmark.findUnique({
      where: { id },
      include: { tags: { select: { tagId: true } } },
    }),
    prisma.tag.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!bookmark || bookmark.userId !== session.user.id) notFound();

  return (
    <div>
      <h2 className="mb-6 text-lg font-bold text-zinc-900">ブックマークを編集</h2>
      <BookmarkForm
        availableTags={tags}
        defaultValues={{
          url: bookmark.url,
          title: bookmark.title,
          memo: bookmark.memo ?? "",
          ogImage: bookmark.ogImage ?? undefined,
          tagIds: bookmark.tags.map((t) => t.tagId),
        }}
        action={updateBookmark.bind(null, id)}
      />
    </div>
  );
}
