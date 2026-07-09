import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, statusForError, unauthorized } from "@/lib/api-response";
import { reorderBookmarks } from "@/lib/bookmarks";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { reorderBodySchema } from "@/lib/schemas/bookmark";

export async function POST(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = reorderBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const result = await reorderBookmarks(user.id, parsed.data.ids);
  if (result.error) return jsonError(result.error, statusForError(result.error));

  return new NextResponse(null, { status: 200 });
}
