import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { getBookmarks } from "@/lib/bookmarks";

export async function GET(req: NextRequest) {
  // API キー認証
  const user = await getUserByApiKey(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 認証ユーザーの未削除ブックマークを取得
  const bookmarks = await getBookmarks(user.id);

  return NextResponse.json({
    bookmarks: bookmarks.map((b) => ({
      id: b.id,
      url: b.url,
      title: b.title,
      memo: b.memo,
      ogImage: b.ogImage,
      category: b.tag ? { id: b.tag.id, name: b.tag.name } : null,
      createdAt: b.createdAt.toISOString(),
    })),
  });
}
