import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getTags(userId: string) {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getTagsWithCount(userId: string) {
  const rawTags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { bookmarks: true } } },
  });

  return rawTags.map(({ _count, ...tag }) => ({
    ...tag,
    bookmarkCount: _count.bookmarks,
  }));
}

export async function createTag(
  userId: string,
  name: string,
): Promise<{ tag?: { id: string; name: string }; conflict?: boolean; error?: string }> {
  if (!name || name.length > 50) return { error: "タグ名が不正です" };

  const existing = await prisma.tag.findUnique({
    where: { userId_name: { userId, name } },
  });
  if (existing) return { conflict: true, tag: { id: existing.id, name: existing.name } };

  try {
    const tag = await prisma.tag.create({
      data: { userId, name },
      select: { id: true, name: true },
    });
    return { tag };
  } catch (e) {
    // findUnique → create の間に別リクエストが同名タグを作成した場合（P2002）は conflict として扱う
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const conflicted = await prisma.tag.findUnique({
        where: { userId_name: { userId, name } },
        select: { id: true, name: true },
      });
      if (conflicted) return { conflict: true, tag: { id: conflicted.id, name: conflicted.name } };
    }
    return { error: "タグの作成に失敗しました" };
  }
}

export async function deleteTag(
  userId: string,
  id: string,
): Promise<{ error?: string }> {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return { error: "タグが見つかりません" };
  if (tag.userId !== userId) return { error: "権限がありません" };

  await prisma.tag.delete({ where: { id } });

  return {};
}
