import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * ランダムな API キー文字列（UUID v4）を生成する。
 */
export function createApiKeyValue(): string {
  return randomUUID();
}

/**
 * ユーザーの API キーを新規発行（再生成）して返す。既存キーは上書きされ無効になる。
 */
export async function generateApiKey(userId: string): Promise<string> {
  const apiKey = createApiKeyValue();
  await prisma.user.update({ where: { id: userId }, data: { apiKey } });
  return apiKey;
}

/**
 * ユーザーの現在の API キーを取得する（未発行なら null）。
 */
export async function getApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { apiKey: true },
  });
  return user?.apiKey ?? null;
}

/**
 * ユーザーの API キーを失効させる（null に戻す）。以降そのキーでの認証は失敗する。
 */
export async function revokeApiKey(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { apiKey: null } });
}
