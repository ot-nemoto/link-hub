"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function deleteBookmark(id: string) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark || bookmark.userId !== session.user.id) return;

  await prisma.bookmark.delete({ where: { id } });
  revalidatePath("/bookmarks");
}
