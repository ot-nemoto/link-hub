// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import { getTags, getTagsWithCount, createTag, deleteTag } from "./tags";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tag: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { prisma } from "@/lib/prisma";

const mockTagFindUnique = vi.mocked(prisma.tag.findUnique);
const mockTagFindMany = vi.mocked(prisma.tag.findMany);
const mockTagCreate = vi.mocked(prisma.tag.create);
const mockTagDelete = vi.mocked(prisma.tag.delete);

const userId = "user_1";
const tag = { id: "tag_1", name: "React", userId };
const otherTag = { ...tag, userId: "user_other" };

describe("getTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: userId でフィルタしてタグ一覧を返す", async () => {
    mockTagFindMany.mockResolvedValue([tag] as never);

    const result = await getTags(userId);

    expect(mockTagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
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
    mockTagFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(tag as never);
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "7.5.0",
    });
    mockTagCreate.mockRejectedValue(p2002);

    const result = await createTag(userId, "React");

    expect(result).toEqual({ conflict: true, tag: { id: "tag_1", name: "React" } });
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
