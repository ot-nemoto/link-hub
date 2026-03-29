import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookmarkForm } from "../BookmarkForm";
import { createBookmark } from "../actions";

export default async function NewBookmarkPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const tags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">
        ブックマークを追加
      </h2>
      <BookmarkForm availableTags={tags} action={createBookmark} />
    </div>
  );
}
