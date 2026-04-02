import { prisma } from "@/lib/prisma";

export type BookmarkData = {
  url: string;
  title: string;
  memo: string;
  ogImage?: string;
  tagIds?: string[];
};

export async function getBookmarks(userId: string, query?: string) {
  const where = {
    userId,
    ...(query && {
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { url: { contains: query, mode: "insensitive" as const } },
        { memo: { contains: query, mode: "insensitive" as const } },
      ],
    }),
  };

  return prisma.bookmark.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      tags: {
        select: {
          tagId: true,
          tag: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function createBookmark(
  userId: string,
  data: BookmarkData,
): Promise<{ error?: string }> {
  const agg = await prisma.bookmark.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  // 自ユーザーのタグのみに絞り込み（他ユーザーの tagId を除外）
  const validTagIds = data.tagIds?.length
    ? (
        await prisma.tag.findMany({
          where: { id: { in: data.tagIds }, userId },
          select: { id: true },
        })
      ).map((t) => t.id)
    : [];

  await prisma.bookmark.create({
    data: {
      userId,
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

  return {};
}

export async function updateBookmark(
  userId: string,
  id: string,
  data: BookmarkData,
): Promise<{ error?: string }> {
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return { error: "ブックマークが見つかりません" };
  if (bookmark.userId !== userId) return { error: "権限がありません" };

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

  return {};
}

export async function updateBookmarkTags(
  userId: string,
  id: string,
  tagIds: string[],
): Promise<{ error?: string }> {
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return { error: "ブックマークが見つかりません" };
  if (bookmark.userId !== userId) return { error: "権限がありません" };

  const validTagIds = tagIds.length
    ? (
        await prisma.tag.findMany({
          where: { id: { in: tagIds }, userId },
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

  return {};
}

export async function reorderBookmarks(
  userId: string,
  ids: string[],
): Promise<{ error?: string }> {
  const owned = await prisma.bookmark.count({
    where: { id: { in: ids }, userId },
  });
  if (owned !== ids.length) return { error: "権限がありません" };

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.bookmark.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );

  return {};
}

export async function deleteBookmark(
  userId: string,
  id: string,
): Promise<{ error?: string }> {
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return { error: "ブックマークが見つかりません" };
  if (bookmark.userId !== userId) return { error: "権限がありません" };

  await prisma.bookmark.delete({ where: { id } });

  return {};
}

export async function deleteBookmarks(
  userId: string,
  ids: string[],
): Promise<{ error?: string }> {
  await prisma.bookmark.deleteMany({
    where: { id: { in: ids }, userId },
  });

  return {};
}

export async function bulkAddTags(
  userId: string,
  bookmarkIds: string[],
  tagIds: string[],
): Promise<{ error?: string }> {
  if (bookmarkIds.length === 0 || tagIds.length === 0) return {};

  const validBookmarkIds = (
    await prisma.bookmark.findMany({
      where: { id: { in: bookmarkIds }, userId },
      select: { id: true },
    })
  ).map((b) => b.id);

  const validTagIds = (
    await prisma.tag.findMany({
      where: { id: { in: tagIds }, userId },
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

  return {};
}
