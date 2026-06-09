import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { getTagsWithCount } from "@/lib/tags";
import { TagsClient } from "./TagsClient";

export default async function TagsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const tags = await getTagsWithCount(session.user.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900">タグ管理</h2>
        <Link
          href="/bookmarks"
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          ← ブックマーク一覧へ
        </Link>
      </div>

      <TagsClient initialTags={tags} />
    </div>
  );
}
