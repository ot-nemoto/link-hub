import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, statusForError, unauthorized } from "@/lib/api-response";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { tagBodySchema } from "@/lib/schemas/tag";
import { createTag, getTags, getTagsWithCount } from "@/lib/tags";

export async function GET(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const withCount = req.nextUrl.searchParams.get("withCount") === "true";
  const tags = withCount ? await getTagsWithCount(user.id) : await getTags(user.id);

  return NextResponse.json({ tags });
}

export async function POST(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = tagBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const result = await createTag(user.id, parsed.data.name);
  if (result.conflict) return jsonError("同名のタグが既に存在します", 409);
  if (result.error) return jsonError(result.error, statusForError(result.error));
  if (!result.tag) return jsonError("作成に失敗しました", 500);

  return NextResponse.json(result.tag, { status: 201 });
}
