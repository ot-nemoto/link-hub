import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getTags(userId: string) {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
}

export async function getTagsWithCount(userId: string) {
  const rawTags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { bookmarks: { where: { deletedAt: null } } } },
    },
  });

  return rawTags.map(({ _count, ...tag }) => ({
    ...tag,
    bookmarkCount: _count?.bookmarks ?? 0,
  }));
}

export async function createTag(
  userId: string,
  name: string,
): Promise<{ tag?: { id: string; name: string }; conflict?: boolean; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 50) return { error: "タグ名が不正です" };

  const existing = await prisma.tag.findUnique({
    where: { userId_name: { userId, name: trimmed } },
  });
  if (existing) return { conflict: true, tag: { id: existing.id, name: existing.name } };

  try {
    const maxSort = await prisma.tag.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const tag = await prisma.tag.create({
      data: { userId, name: trimmed, sortOrder },
      select: { id: true, name: true },
    });
    return { tag };
  } catch (e) {
    // findUnique → create の間に別リクエストが同名タグを作成した場合（P2002）は conflict として扱う
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const conflicted = await prisma.tag.findUnique({
        where: { userId_name: { userId, name: trimmed } },
        select: { id: true, name: true },
      });
      if (conflicted) return { conflict: true, tag: { id: conflicted.id, name: conflicted.name } };
    }
    return { error: "タグの作成に失敗しました" };
  }
}

export async function updateTag(
  userId: string,
  id: string,
  name: string,
): Promise<{ tag?: { id: string; name: string }; conflict?: boolean; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 50) return { error: "タグ名が不正です" };

  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return { error: "タグが見つかりません" };
  if (tag.userId !== userId) return { error: "権限がありません" };

  if (tag.name === trimmed) return { tag: { id: tag.id, name: tag.name } };

  const existing = await prisma.tag.findUnique({
    where: { userId_name: { userId, name: trimmed } },
  });
  if (existing && existing.id !== id) {
    return { conflict: true, tag: { id: existing.id, name: existing.name } };
  }

  try {
    const updated = await prisma.tag.update({
      where: { id },
      data: { name: trimmed },
      select: { id: true, name: true },
    });
    return { tag: updated };
  } catch (e) {
    // findUnique → update の間に別リクエストが同名タグを作成した場合（P2002）は conflict として扱う
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const conflicted = await prisma.tag.findUnique({
        where: { userId_name: { userId, name: trimmed } },
        select: { id: true, name: true },
      });
      if (conflicted) return { conflict: true, tag: { id: conflicted.id, name: conflicted.name } };
    }
    return { error: "タグの更新に失敗しました" };
  }
}

export async function reorderTags(userId: string, ids: string[]): Promise<{ error?: string }> {
  // 重複 ID があっても誤判定しないよう、所有権チェックはユニーク ID 基準で行う
  const uniqueIds = [...new Set(ids)];
  const count = await prisma.tag.count({ where: { id: { in: uniqueIds }, userId } });
  if (count !== uniqueIds.length) return { error: "権限がありません" };

  await prisma.$transaction(
    ids.map((id, index) => prisma.tag.update({ where: { id }, data: { sortOrder: index } })),
  );

  return {};
}

export async function deleteTag(userId: string, id: string): Promise<{ error?: string }> {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return { error: "タグが見つかりません" };
  if (tag.userId !== userId) return { error: "権限がありません" };

  await prisma.tag.delete({ where: { id } });

  return {};
}
