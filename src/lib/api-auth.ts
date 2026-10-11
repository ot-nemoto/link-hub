import type { NextRequest } from "next/server";

import { hashApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";

// 棚卸し用途には時間単位の粒度で足りるため、毎リクエストの書き込みを避ける
const LAST_USED_UPDATE_INTERVAL_MS = 60 * 60 * 1000;

/**
 * `Authorization: Bearer <apiKey>` ヘッダーから API キーを取り出し、
 * ハッシュ化して対応するユーザーを返す。ヘッダー不正・キー未一致の場合は null。
 */
export async function getUserByApiKey(req: NextRequest): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) return null;

  const user = await prisma.user.findUnique({
    where: { apiKeyHash: await hashApiKey(apiKey) },
    select: { id: true, apiKeyLastUsedAt: true },
  });
  if (!user) return null;

  const now = new Date();
  if (
    !user.apiKeyLastUsedAt ||
    now.getTime() - user.apiKeyLastUsedAt.getTime() >= LAST_USED_UPDATE_INTERVAL_MS
  ) {
    // 棚卸し用の付随情報であり、更新失敗で認証済みリクエストを落とさない（次回リクエストで再試行される）
    try {
      await prisma.user.update({ where: { id: user.id }, data: { apiKeyLastUsedAt: now } });
    } catch {}
  }
  return { id: user.id };
}
