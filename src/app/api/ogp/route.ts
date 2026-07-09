import { type NextRequest, NextResponse } from "next/server";

import { getUserByApiKey } from "@/lib/api-auth";
import { jsonError, unauthorized } from "@/lib/api-response";
import { fetchOgpData } from "@/lib/ogp";

export async function GET(req: NextRequest) {
  const user = await getUserByApiKey(req);
  if (!user) return unauthorized();

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return jsonError("url は必須です", 400);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return jsonError("url の形式が不正です", 400);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return jsonError("url は http または https のみ対応しています", 400);
  }

  // 取得失敗・SSRF ブロックはエラーにせず空メタデータを返す（自動補完用途のためベストエフォート）
  const result = await fetchOgpData(url);

  return NextResponse.json({ title: result.title ?? null, image: result.image ?? null });
}
