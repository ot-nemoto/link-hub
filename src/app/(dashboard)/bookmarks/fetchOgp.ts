"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { fetchOgpData } from "@/lib/ogp";

export async function fetchOgp(
  url: string,
): Promise<{ title?: string; image?: string; error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  return fetchOgpData(url);
}
