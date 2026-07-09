import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, serializeBookmark, statusForError, unauthorized } from "@/lib/api-response";
import { createBookmark, deleteBookmarks, getBookmarks } from "@/lib/bookmarks";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { bookmarkBodySchema } from "@/lib/schemas/bookmark";

export async function GET(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const bookmarks = await getBookmarks(user.id);

  return NextResponse.json({ bookmarks: bookmarks.map(serializeBookmark) });
}

export async function POST(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = bookmarkBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const result = await createBookmark(user.id, parsed.data);
  if (result.error) return jsonError(result.error, statusForError(result.error));
  if (!result.bookmark) return jsonError("作成に失敗しました", 500);

  return NextResponse.json(serializeBookmark(result.bookmark), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return jsonError("ids は必須です", 400);

  const result = await deleteBookmarks(user.id, ids);
  if (result.error) return jsonError(result.error, statusForError(result.error));

  return new NextResponse(null, { status: 204 });
}
