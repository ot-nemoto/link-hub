import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import {
  jsonError,
  serializeBookmark,
  statusForError,
  unauthorized,
  withApiErrorHandling,
} from "@/lib/api-response";
import { deleteBookmark, updateBookmark } from "@/lib/bookmarks";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { bookmarkBodySchema } from "@/lib/schemas/bookmark";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withApiErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = bookmarkBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const result = await updateBookmark(user.id, id, parsed.data);
  if ("error" in result) return jsonError(result.error, statusForError(result.error));

  return NextResponse.json(serializeBookmark(result.bookmark));
});

export const DELETE = withApiErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const result = await deleteBookmark(user.id, id);
  if (result.error) return jsonError(result.error, statusForError(result.error));

  return new NextResponse(null, { status: 204 });
});
