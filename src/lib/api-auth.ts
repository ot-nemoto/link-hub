import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * `Authorization: Bearer <apiKey>` ヘッダーから API キーを取り出し、
 * 対応するユーザーを返す。ヘッダー不正・キー未一致の場合は null。
 */
export async function getUserByApiKey(req: NextRequest): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) return null;

  const user = await prisma.user.findUnique({
    where: { apiKey },
    select: { id: true },
  });
  return user;
}
