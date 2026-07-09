import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, statusForError, unauthorized } from "@/lib/api-response";
import { reorderBookmarks } from "@/lib/bookmarks";

export async function POST(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return jsonError("ids は文字列の配列で指定してください", 400);
  }
  if (ids.length === 0) return jsonError("ids は必須です", 400);

  const result = await reorderBookmarks(user.id, ids);
  if (result.error) return jsonError(result.error, statusForError(result.error));

  return new NextResponse(null, { status: 200 });
}
