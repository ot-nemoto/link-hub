import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, serializeBookmark, statusForError, unauthorized } from "@/lib/api-response";
import { toBookmarkData, validateBookmarkInput } from "@/lib/bookmark-validation";
import { deleteBookmark, updateBookmark } from "@/lib/bookmarks";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("リクエストボディが不正です", 400);

  const validationError = validateBookmarkInput(body);
  if (validationError) return jsonError(validationError, 400);

  const result = await updateBookmark(user.id, id, toBookmarkData(body));
  if (result.error) return jsonError(result.error, statusForError(result.error));
  if (!result.bookmark) return jsonError("更新に失敗しました", 500);

  return NextResponse.json(serializeBookmark(result.bookmark));
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const result = await deleteBookmark(user.id, id);
  if (result.error) return jsonError(result.error, statusForError(result.error));

  return new NextResponse(null, { status: 204 });
}
