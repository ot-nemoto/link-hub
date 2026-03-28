"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type BookmarkData = { url: string; title: string; memo: string; ogImage?: string };

export async function createBookmark(data: BookmarkData): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  await prisma.bookmark.create({
    data: {
      userId: session.user.id,
      url: data.url,
      title: data.title,
      memo: data.memo || null,
      ogImage: data.ogImage ?? null,
    },
  });

  revalidatePath("/bookmarks");
  return {};
}

export async function updateBookmark(id: string, data: BookmarkData): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return { error: "ブックマークが見つかりません" };
  if (bookmark.userId !== session.user.id) return { error: "権限がありません" };

  await prisma.bookmark.update({
    where: { id },
    data: {
      url: data.url,
      title: data.title,
      memo: data.memo || null,
      ...(data.ogImage !== undefined ? { ogImage: data.ogImage ?? null } : {}),
    },
  });

  revalidatePath("/bookmarks");
  return {};
}

export async function deleteBookmark(
  id: string,
  _prevState: { error?: string },
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return { error: "ブックマークが見つかりません" };
  if (bookmark.userId !== session.user.id) return { error: "権限がありません" };

  await prisma.bookmark.delete({ where: { id } });
  revalidatePath("/bookmarks");
  return {};
}

export async function deleteBookmarks(ids: string[]): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  await prisma.bookmark.deleteMany({
    where: { id: { in: ids }, userId: session.user.id },
  });

  revalidatePath("/bookmarks");
  return {};
}
