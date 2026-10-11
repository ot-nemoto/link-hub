import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, statusForError, unauthorized, withApiErrorHandling } from "@/lib/api-response";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { tagBodySchema } from "@/lib/schemas/tag";
import { deleteTag, updateTag } from "@/lib/tags";

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withApiErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = tagBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const result = await updateTag(user.id, id, parsed.data.name);
  if ("error" in result) return jsonError(result.error, statusForError(result.error));
  if (result.conflict) return jsonError("同名のタグが既に存在します", 409);

  return NextResponse.json(result.tag);
});

export const DELETE = withApiErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const result = await deleteTag(user.id, id);
  if (result.error) return jsonError(result.error, statusForError(result.error));

  return new NextResponse(null, { status: 204 });
});
