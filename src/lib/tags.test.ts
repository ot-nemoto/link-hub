// @vitest-environment node

import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTag, deleteTag, getTags, getTagsWithCount, reorderTags } from "./tags";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tag: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { prisma } from "@/lib/prisma";

const mockTagFindUnique = vi.mocked(prisma.tag.findUnique);
const mockTagFindMany = vi.mocked(prisma.tag.findMany);
const mockTagCreate = vi.mocked(prisma.tag.create);
const mockTagDelete = vi.mocked(prisma.tag.delete);
const mockTagAggregate = vi.mocked(prisma.tag.aggregate);
const mockTagCount = vi.mocked(prisma.tag.count);
const mockTransaction = vi.mocked(prisma.$transaction);

const userId = "user_1";
const tag = { id: "tag_1", name: "React", userId };
const otherTag = { ...tag, userId: "user_other" };

describe("getTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: userId でフィルタしてタグ一覧を返す", async () => {
    mockTagFindMany.mockResolvedValue([tag] as never);

    const result = await getTags(userId);

    expect(mockTagFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId } }));
    expect(result).toEqual([tag]);
  });
});

describe("getTagsWithCount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: bookmarkCount を付加して返す", async () => {
    mockTagFindMany.mockResolvedValue([
      { id: "tag_1", name: "React", _count: { bookmarks: 3 } },
    ] as never);

    const result = await getTagsWithCount(userId);

    expect(result).toEqual([{ id: "tag_1", name: "React", bookmarkCount: 3 }]);
  });
});

describe("createTag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: タグを作成して { tag } を返す", async () => {
    mockTagFindUnique.mockResolvedValue(null);
    mockTagAggregate.mockResolvedValue({ _max: { sortOrder: 2 } } as never);
    mockTagCreate.mockResolvedValue({ id: "tag_1", name: "React" } as never);

    const result = await createTag(userId, "React");

    expect(result).toEqual({ tag: { id: "tag_1", name: "React" } });
  });

  it("名前が空の場合は error を返す", async () => {
    const result = await createTag(userId, "");

    expect(result).toEqual({ error: "タグ名が不正です" });
    expect(mockTagCreate).not.toHaveBeenCalled();
  });

  it("名前が51文字以上の場合は error を返す", async () => {
    const result = await createTag(userId, "a".repeat(51));

    expect(result).toEqual({ error: "タグ名が不正です" });
    expect(mockTagCreate).not.toHaveBeenCalled();
  });

  it("既存タグと重複する場合は { conflict: true, tag } を返す", async () => {
    mockTagFindUnique.mockResolvedValue(tag as never);

    const result = await createTag(userId, "React");

    expect(result).toEqual({ conflict: true, tag: { id: "tag_1", name: "React" } });
    expect(mockTagCreate).not.toHaveBeenCalled();
  });

  it("P2002 レース条件の場合は { conflict: true, tag } を返す", async () => {
    mockTagFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(tag as never);
    mockTagAggregate.mockResolvedValue({ _max: { sortOrder: 0 } } as never);
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "7.5.0",
    });
    mockTagCreate.mockRejectedValue(p2002);

    const result = await createTag(userId, "React");

    expect(result).toEqual({ conflict: true, tag: { id: "tag_1", name: "React" } });
  });
});

describe("reorderTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 全件自ユーザー所有なら並び替えて {} を返す", async () => {
    mockTagCount.mockResolvedValue(2);
    mockTransaction.mockResolvedValue([]);

    const result = await reorderTags(userId, ["tag_1", "tag_2"]);

    expect(result).toEqual({});
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("他ユーザーのタグが含まれる場合は error を返す", async () => {
    mockTagCount.mockResolvedValue(1);

    const result = await reorderTags(userId, ["tag_1", "tag_other"]);

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("deleteTag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: タグを削除して {} を返す", async () => {
    mockTagFindUnique.mockResolvedValue(tag as never);
    mockTagDelete.mockResolvedValue(tag as never);

    const result = await deleteTag(userId, "tag_1");

    expect(result).toEqual({});
    expect(mockTagDelete).toHaveBeenCalledWith({ where: { id: "tag_1" } });
  });

  it("存在しないタグは error を返す", async () => {
    mockTagFindUnique.mockResolvedValue(null);

    const result = await deleteTag(userId, "tag_not_exist");

    expect(result).toEqual({ error: "タグが見つかりません" });
    expect(mockTagDelete).not.toHaveBeenCalled();
  });

  it("他ユーザーのタグは error を返す", async () => {
    mockTagFindUnique.mockResolvedValue(otherTag as never);

    const result = await deleteTag(userId, "tag_1");

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockTagDelete).not.toHaveBeenCalled();
  });
});
