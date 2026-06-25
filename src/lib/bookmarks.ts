import { prisma } from "@/lib/prisma";

export type BookmarkData = {
  url: string;
  title: string;
  memo: string;
  ogImage?: string;
  tagId?: string | null;
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
      tag: { select: { id: true, name: true } },
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

  let validTagId: string | null = null;
  if (data.tagId) {
    const tag = await prisma.tag.findFirst({
      where: { id: data.tagId, userId },
      select: { id: true },
    });
    if (tag) validTagId = tag.id;
  }

  await prisma.bookmark.create({
    data: {
      userId,
      url: data.url,
      title: data.title,
      memo: data.memo || null,
      ogImage: data.ogImage ?? null,
      sortOrder,
      tagId: validTagId,
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

  let validTagId: string | null | undefined;
  if (data.tagId !== undefined) {
    if (data.tagId) {
      const tag = await prisma.tag.findFirst({
        where: { id: data.tagId, userId },
        select: { id: true },
      });
      validTagId = tag ? tag.id : null;
    } else {
      validTagId = null;
    }
  }

  await prisma.bookmark.update({
    where: { id },
    data: {
      url: data.url,
      title: data.title,
      memo: data.memo || null,
      ...(data.ogImage !== undefined ? { ogImage: data.ogImage ?? null } : {}),
      ...(validTagId !== undefined ? { tagId: validTagId } : {}),
    },
  });

  return {};
}

export async function moveBookmark(
  userId: string,
  id: string,
  tagId: string | null,
  sortOrder: number,
): Promise<{ error?: string }> {
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return { error: "ブックマークが見つかりません" };
  if (bookmark.userId !== userId) return { error: "権限がありません" };

  if (tagId) {
    const tag = await prisma.tag.findFirst({
      where: { id: tagId, userId },
      select: { id: true },
    });
    if (!tag) return { error: "カテゴリが見つかりません" };
  }

  await prisma.bookmark.update({
    where: { id },
    data: { tagId, sortOrder },
  });

  return {};
}

export async function reorderBookmarks(userId: string, ids: string[]): Promise<{ error?: string }> {
  const owned = await prisma.bookmark.count({
    where: { id: { in: ids }, userId },
  });
  if (owned !== ids.length) return { error: "権限がありません" };

  await prisma.$transaction(
    ids.map((id, index) => prisma.bookmark.update({ where: { id }, data: { sortOrder: index } })),
  );

  return {};
}

export async function deleteBookmark(userId: string, id: string): Promise<{ error?: string }> {
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return { error: "ブックマークが見つかりません" };
  if (bookmark.userId !== userId) return { error: "権限がありません" };

  await prisma.bookmark.delete({ where: { id } });

  return {};
}

export async function deleteBookmarks(userId: string, ids: string[]): Promise<{ error?: string }> {
  await prisma.bookmark.deleteMany({
    where: { id: { in: ids }, userId },
  });

  return {};
}
