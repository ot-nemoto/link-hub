import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, unauthorized } from "@/lib/api-response";
import { fetchOgpData } from "@/lib/ogp";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { ogpQuerySchema } from "@/lib/schemas/ogp";

export async function GET(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const parsed = ogpQuerySchema.safeParse({ url: req.nextUrl.searchParams.get("url") });
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  // 取得失敗・SSRF ブロックはエラーにせず空メタデータを返す（自動補完用途のためベストエフォート）
  const result = await fetchOgpData(parsed.data.url);

  return NextResponse.json({ title: result.title ?? null, image: result.image ?? null });
}
