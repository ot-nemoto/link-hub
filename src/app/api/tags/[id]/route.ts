import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, statusForError, unauthorized } from "@/lib/api-response";
import { deleteTag, updateTag } from "@/lib/tags";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.name !== "string") {
    return jsonError("name は必須です", 400);
  }

  const result = await updateTag(user.id, id, body.name);
  if (result.conflict) return jsonError("同名のカテゴリが既に存在します", 409);
  if (result.error) return jsonError(result.error, statusForError(result.error));
  if (!result.tag) return jsonError("更新に失敗しました", 500);

  return NextResponse.json(result.tag);
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const result = await deleteTag(user.id, id);
  if (result.error) return jsonError(result.error, statusForError(result.error));

  return new NextResponse(null, { status: 204 });
}
