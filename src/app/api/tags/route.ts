import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, statusForError, unauthorized, withApiErrorHandling } from "@/lib/api-response";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { tagBodySchema } from "@/lib/schemas/tag";
import { createTag, getTags, getTagsWithCount } from "@/lib/tags";

export const GET = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const withCount = req.nextUrl.searchParams.get("withCount") === "true";
  const tags = withCount ? await getTagsWithCount(user.id) : await getTags(user.id);

  return NextResponse.json({ tags });
});

export const POST = withApiErrorHandling(async (req: NextRequest) => {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = tagBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const result = await createTag(user.id, parsed.data.name);
  if ("error" in result) return jsonError(result.error, statusForError(result.error));
  if (result.conflict) return jsonError("同名のタグが既に存在します", 409);

  return NextResponse.json(result.tag, { status: 201 });
});
