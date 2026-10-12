import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { serializeBookmark, unauthorized, withApiErrorHandling } from "@/lib/api-response";
import { emptyTrash, getDeletedBookmarks } from "@/lib/bookmarks";

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const bookmarks = await getDeletedBookmarks(user.id);

  return NextResponse.json({ bookmarks: bookmarks.map(serializeBookmark) });
});

export const DELETE = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  await emptyTrash(user.id);

  return new NextResponse(null, { status: 204 });
});
