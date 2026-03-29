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

export async function reorderBookmarks(ids: string[]): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const owned = await prisma.bookmark.count({
    where: { id: { in: ids }, userId: session.user.id },
  });
  if (owned !== ids.length) return { error: "権限がありません" };

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.bookmark.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  revalidatePath("/bookmarks");
  return {};
}

export async function createTag(
  name: string,
): Promise<{ tag?: { id: string; name: string }; conflict?: boolean; error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  if (!name || name.length > 50) return { error: "タグ名が不正です" };

  const existing = await prisma.tag.findUnique({
    where: { userId_name: { userId: session.user.id, name } },
  });
  if (existing) return { conflict: true, tag: { id: existing.id, name: existing.name } };

  try {
    const tag = await prisma.tag.create({
      data: { userId: session.user.id, name },
      select: { id: true, name: true },
    });
    revalidatePath("/bookmarks");
    return { tag };
  } catch {
    return { error: "タグの作成に失敗しました" };
  }
}

export async function deleteTag(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return { error: "タグが見つかりません" };
  if (tag.userId !== session.user.id) return { error: "権限がありません" };

  await prisma.tag.delete({ where: { id } });

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
