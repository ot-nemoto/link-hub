import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type BookmarkData = {
  url: string;
  title: string;
  memo?: string;
  ogImage?: string;
  tagId?: string | null;
  hideOgImage?: boolean;
  sortOrder?: number;
};

export type BookmarkWithTag = Prisma.BookmarkGetPayload<{
  include: { tag: { select: { id: true; name: true } } };
}>;

export async function getBookmarks(userId: string, query?: string) {
  const where = {
    userId,
    deletedAt: null,
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

export async function getDeletedBookmarks(userId: string) {
  return prisma.bookmark.findMany({
    where: { userId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: {
      tag: { select: { id: true, name: true } },
    },
  });
}

export async function createBookmark(
  userId: string,
  data: BookmarkData,
): Promise<{ bookmark?: BookmarkWithTag; error?: string }> {
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
    if (!tag) return { error: "タグが見つかりません" };
    validTagId = tag.id;
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      url: data.url,
      title: data.title,
      memo: data.memo || null,
      ogImage: data.ogImage ?? null,
      sortOrder,
      tagId: validTagId,
    },
    include: { tag: { select: { id: true, name: true } } },
  });

  return { bookmark };
}

export async function updateBookmark(
  userId: string,
  id: string,
  data: BookmarkData,
): Promise<{ bookmark?: BookmarkWithTag; error?: string }> {
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
      if (!tag) return { error: "タグが見つかりません" };
      validTagId = tag.id;
    } else {
      validTagId = null; // 明示的な null は未分類化
    }
  }

  const updated = await prisma.bookmark.update({
    where: { id },
    data: {
      url: data.url,
      title: data.title,
      ...(data.memo !== undefined ? { memo: data.memo || null } : {}),
      ...(data.ogImage !== undefined ? { ogImage: data.ogImage ?? null } : {}),
      ...(data.hideOgImage !== undefined ? { hideOgImage: data.hideOgImage } : {}),
      ...(validTagId !== undefined ? { tagId: validTagId } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
    include: { tag: { select: { id: true, name: true } } },
  });

  return { bookmark: updated };
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
    if (!tag) return { error: "タグが見つかりません" };
  }

  await prisma.bookmark.update({
    where: { id },
    data: { tagId, sortOrder },
  });

  return {};
}

export async function reorderBookmarks(userId: string, ids: string[]): Promise<{ error?: string }> {
  // 重複 ID があっても誤判定しないよう、所有権チェックはユニーク ID 基準で行う
  const uniqueIds = [...new Set(ids)];
  const owned = await prisma.bookmark.count({
    where: { id: { in: uniqueIds }, userId },
  });
  if (owned !== uniqueIds.length) return { error: "権限がありません" };

  await prisma.$transaction(
    ids.map((id, index) => prisma.bookmark.update({ where: { id }, data: { sortOrder: index } })),
  );

  return {};
}

export async function deleteBookmark(userId: string, id: string): Promise<{ error?: string }> {
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return { error: "ブックマークが見つかりません" };
  if (bookmark.userId !== userId) return { error: "権限がありません" };

  // ソフトデリート: 物理削除せず deletedAt を設定してゴミ箱に移す
  await prisma.bookmark.update({ where: { id }, data: { deletedAt: new Date() } });

  return {};
}

export async function deleteBookmarks(userId: string, ids: string[]): Promise<{ error?: string }> {
  await prisma.bookmark.updateMany({
    where: { id: { in: ids }, userId },
    data: { deletedAt: new Date() },
  });

  return {};
}

export async function restoreBookmark(
  userId: string,
  id: string,
): Promise<{ bookmark?: BookmarkWithTag; error?: string }> {
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return { error: "ブックマークが見つかりません" };
  if (bookmark.userId !== userId) return { error: "権限がありません" };

  // deletedAt を null に戻す。tagId は保持されているため元のタグに復帰する
  const restored = await prisma.bookmark.update({
    where: { id },
    data: { deletedAt: null },
    include: { tag: { select: { id: true, name: true } } },
  });

  return { bookmark: restored };
}

export async function emptyTrash(userId: string): Promise<{ error?: string }> {
  // ゴミ箱内（deletedAt が非 null）のブックマークを物理削除する
  await prisma.bookmark.deleteMany({
    where: { userId, deletedAt: { not: null } },
  });

  return {};
}
