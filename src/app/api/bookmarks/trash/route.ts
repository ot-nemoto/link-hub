import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { serializeBookmark, unauthorized } from "@/lib/api-response";
import { emptyTrash, getDeletedBookmarks } from "@/lib/bookmarks";

export async function GET(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const bookmarks = await getDeletedBookmarks(user.id);

  return NextResponse.json({ bookmarks: bookmarks.map(serializeBookmark) });
}

export async function DELETE(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  await emptyTrash(user.id);

  return new NextResponse(null, { status: 204 });
}
