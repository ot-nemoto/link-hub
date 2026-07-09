import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, serializeBookmark, statusForError, unauthorized } from "@/lib/api-response";
import { restoreBookmark } from "@/lib/bookmarks";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const result = await restoreBookmark(user.id, id);
  if (result.error) return jsonError(result.error, statusForError(result.error));
  if (!result.bookmark) return jsonError("復元に失敗しました", 500);

  return NextResponse.json(serializeBookmark(result.bookmark));
}
