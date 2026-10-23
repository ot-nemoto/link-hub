"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  generateApiKey as libGenerateApiKey,
  revokeApiKey as libRevokeApiKey,
} from "@/lib/api-key";
import { getSession } from "@/lib/auth";

export async function generateApiKey(): Promise<{ apiKey?: string; error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  try {
    const apiKey = await libGenerateApiKey(session.user.id);
    revalidatePath("/bookmarks");
    return { apiKey };
  } catch (e) {
    // 画面内（モーダル）に文言を出すため { error } に変換するが、変換すると digest による
    // サーバーログとの突き合わせが失われる。痕跡を残すため記録してから返す。
    console.error(e);
    return { error: "API キーの生成に失敗しました" };
  }
}

export async function revokeApiKey(): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  try {
    await libRevokeApiKey(session.user.id);
    revalidatePath("/bookmarks");
    return {};
  } catch (e) {
    // 画面内（モーダル）に文言を出すため { error } に変換するが、変換すると digest による
    // サーバーログとの突き合わせが失われる。痕跡を残すため記録してから返す。
    console.error(e);
    return { error: "API キーの失効に失敗しました" };
  }
}
