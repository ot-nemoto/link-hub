"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type BookmarkData = {
  url: string;
  title: string;
  memo: string;
  ogImage?: string;
  tagIds?: string[];
};

export async function createBookmark(data: BookmarkData): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const agg = await prisma.bookmark.aggregate({
    where: { userId: session.user.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  // 自ユーザーのタグのみに絞り込み（他ユーザーの tagId を除外）
  const validTagIds = data.tagIds?.length
    ? (
        await prisma.tag.findMany({
          where: { id: { in: data.tagIds }, userId: session.user.id },
          select: { id: true },
        })
      ).map((t) => t.id)
    : [];

  await prisma.bookmark.create({
    data: {
      userId: session.user.id,
      url: data.url,
      title: data.title,
      memo: data.memo || null,
      ogImage: data.ogImage ?? null,
      sortOrder,
      ...(validTagIds.length
        ? { tags: { create: validTagIds.map((tagId) => ({ tagId })) } }
        : {}),
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
      ...(data.tagIds !== undefined
        ? {
            tags: {
              deleteMany: {},
              ...(data.tagIds.length
                ? { create: data.tagIds.map((tagId) => ({ tagId })) }
                : {}),
            },
          }
        : {}),
    },
  });

  revalidatePath("/bookmarks");
  return {};
}

export async function updateBookmarkTags(
  id: string,
  tagIds: string[],
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return { error: "ブックマークが見つかりません" };
  if (bookmark.userId !== session.user.id) return { error: "権限がありません" };

  const validTagIds = tagIds.length
    ? (
        await prisma.tag.findMany({
          where: { id: { in: tagIds }, userId: session.user.id },
          select: { id: true },
        })
      ).map((t) => t.id)
    : [];

  await prisma.bookmark.update({
    where: { id },
    data: {
      tags: {
        deleteMany: {},
        ...(validTagIds.length
          ? { create: validTagIds.map((tagId) => ({ tagId })) }
          : {}),
      },
    },
  });

  revalidatePath("/bookmarks");
  return {};
}

export async function bulkAddTags(
  bookmarkIds: string[],
  tagIds: string[],
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  if (bookmarkIds.length === 0 || tagIds.length === 0) return {};

  const validBookmarkIds = (
    await prisma.bookmark.findMany({
      where: { id: { in: bookmarkIds }, userId: session.user.id },
      select: { id: true },
    })
  ).map((b) => b.id);

  const validTagIds = (
    await prisma.tag.findMany({
      where: { id: { in: tagIds }, userId: session.user.id },
      select: { id: true },
    })
  ).map((t) => t.id);

  if (validBookmarkIds.length === 0 || validTagIds.length === 0) return {};

  await prisma.bookmarkTag.createMany({
    data: validBookmarkIds.flatMap((bookmarkId) =>
      validTagIds.map((tagId) => ({ bookmarkId, tagId })),
    ),
    skipDuplicates: true,
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
