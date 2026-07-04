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
  } catch {
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
  } catch {
    return { error: "API キーの失効に失敗しました" };
  }
}
