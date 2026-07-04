"use server";

import { redirect } from "next/navigation";

import {
  generateApiKey as libGenerateApiKey,
  revokeApiKey as libRevokeApiKey,
} from "@/lib/api-key";
import { getSession } from "@/lib/auth";

export async function generateApiKey(): Promise<{ apiKey: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const apiKey = await libGenerateApiKey(session.user.id);
  return { apiKey };
}

export async function revokeApiKey(): Promise<{ apiKey: null }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  await libRevokeApiKey(session.user.id);
  return { apiKey: null };
}
