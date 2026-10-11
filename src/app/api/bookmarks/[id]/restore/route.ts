import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import {
  jsonError,
  serializeBookmark,
  statusForError,
  unauthorized,
  withApiErrorHandling,
} from "@/lib/api-response";
import { restoreBookmark } from "@/lib/bookmarks";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withApiErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const result = await restoreBookmark(user.id, id);
  if ("error" in result) return jsonError(result.error, statusForError(result.error));

  return NextResponse.json(serializeBookmark(result.bookmark));
});
