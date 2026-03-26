import { notFound, redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookmarkForm } from "../../BookmarkForm";
import { updateBookmark } from "../../actions";

export default async function EditBookmarkPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const { id } = await params;
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark || bookmark.userId !== session.user.id) notFound();

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">ブックマークを編集</h2>
      <BookmarkForm
        defaultValues={{ url: bookmark.url, title: bookmark.title, memo: bookmark.memo ?? "" }}
        action={updateBookmark.bind(null, id)}
      />
    </div>
  );
}
