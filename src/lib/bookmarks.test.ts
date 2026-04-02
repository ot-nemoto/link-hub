// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getBookmarks,
  createBookmark,
  updateBookmark,
  updateBookmarkTags,
  reorderBookmarks,
  deleteBookmark,
  deleteBookmarks,
  bulkAddTags,
} from "./bookmarks";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bookmark: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
    },
    bookmarkTag: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { prisma } from "@/lib/prisma";

const mockBookmarkCreate = vi.mocked(prisma.bookmark.create);
const mockBookmarkFindUnique = vi.mocked(prisma.bookmark.findUnique);
const mockBookmarkFindMany = vi.mocked(prisma.bookmark.findMany);
const mockBookmarkUpdate = vi.mocked(prisma.bookmark.update);
const mockBookmarkDelete = vi.mocked(prisma.bookmark.delete);
const mockBookmarkDeleteMany = vi.mocked(prisma.bookmark.deleteMany);
const mockBookmarkAggregate = vi.mocked(prisma.bookmark.aggregate);
const mockBookmarkCount = vi.mocked(prisma.bookmark.count);
const mockTagFindMany = vi.mocked(prisma.tag.findMany);
const mockBookmarkTagCreateMany = vi.mocked(prisma.bookmarkTag.createMany);
const mockTransaction = vi.mocked(prisma.$transaction);

const userId = "user_1";
const bookmark = {
  id: "bm_1",
  userId,
  url: "https://example.com",
  title: "Example",
  memo: null,
  ogImage: null,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const otherBookmark = { ...bookmark, userId: "user_other" };
const bookmarkData = { url: "https://example.com", title: "Example", memo: "" };

describe("getBookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: userId でフィルタして返す", async () => {
    mockBookmarkFindMany.mockResolvedValue([bookmark] as never);

    const result = await getBookmarks(userId);

    expect(mockBookmarkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
    expect(result).toEqual([bookmark]);
  });

  it("キーワード検索: query があれば OR 条件を付加する", async () => {
    mockBookmarkFindMany.mockResolvedValue([] as never);

    await getBookmarks(userId, "test");

    expect(mockBookmarkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
  });
});

describe("createBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ブックマークを作成して {} を返す", async () => {
    mockBookmarkAggregate.mockResolvedValue({ _max: { sortOrder: 3 } } as never);
    mockBookmarkCreate.mockResolvedValue(bookmark);

    const result = await createBookmark(userId, bookmarkData);

    expect(result).toEqual({});
    expect(mockBookmarkAggregate).toHaveBeenCalledWith({
      where: { userId },
      _max: { sortOrder: true },
    });
    expect(mockBookmarkCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId, url: "https://example.com", sortOrder: 4 }),
    });
  });

  it("ブックマークが0件のとき sortOrder が 0 になる", async () => {
    mockBookmarkAggregate.mockResolvedValue({ _max: { sortOrder: null } } as never);
    mockBookmarkCreate.mockResolvedValue(bookmark);

    await createBookmark(userId, bookmarkData);

    expect(mockBookmarkCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 0 }),
    });
  });
});

describe("updateBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ブックマークを更新して {} を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockBookmarkUpdate.mockResolvedValue({ ...bookmark, title: "Updated" });

    const result = await updateBookmark(userId, "bm_1", { ...bookmarkData, title: "Updated" });

    expect(result).toEqual({});
    expect(mockBookmarkUpdate).toHaveBeenCalled();
  });

  it("存在しないブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(null);

    const result = await updateBookmark(userId, "bm_not_exist", bookmarkData);

    expect(result).toEqual({ error: "ブックマークが見つかりません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark as never);

    const result = await updateBookmark(userId, "bm_1", bookmarkData);

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });

  it("ogImage が undefined の場合は update データに ogImage を含めない（既存値を保持）", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    await updateBookmark(userId, "bm_1", { ...bookmarkData, ogImage: undefined });

    expect(mockBookmarkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ ogImage: expect.anything() }),
      }),
    );
  });
});

describe("updateBookmarkTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ブックマークのタグを上書きして {} を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockTagFindMany.mockResolvedValue([{ id: "tag_1" }, { id: "tag_2" }] as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    const result = await updateBookmarkTags(userId, "bm_1", ["tag_1", "tag_2"]);

    expect(result).toEqual({});
    expect(mockBookmarkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "bm_1" } }),
    );
  });

  it("存在しないブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(null);

    const result = await updateBookmarkTags(userId, "bm_not_exist", ["tag_1"]);

    expect(result).toEqual({ error: "ブックマークが見つかりません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark as never);

    const result = await updateBookmarkTags(userId, "bm_1", ["tag_1"]);

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });
});

describe("reorderBookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 全件自ユーザー所有なら並び替えて {} を返す", async () => {
    mockBookmarkCount.mockResolvedValue(2);
    mockTransaction.mockResolvedValue([]);

    const result = await reorderBookmarks(userId, ["bm_1", "bm_2"]);

    expect(result).toEqual({});
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("他ユーザーのブックマークが含まれる場合は error を返す", async () => {
    mockBookmarkCount.mockResolvedValue(1);

    const result = await reorderBookmarks(userId, ["bm_1", "bm_other"]);

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("deleteBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ブックマークを削除して {} を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockBookmarkDelete.mockResolvedValue(bookmark);

    const result = await deleteBookmark(userId, "bm_1");

    expect(result).toEqual({});
    expect(mockBookmarkDelete).toHaveBeenCalledWith({ where: { id: "bm_1" } });
  });

  it("存在しないブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(null);

    const result = await deleteBookmark(userId, "bm_not_exist");

    expect(result).toEqual({ error: "ブックマークが見つかりません" });
    expect(mockBookmarkDelete).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark as never);

    const result = await deleteBookmark(userId, "bm_1");

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockBookmarkDelete).not.toHaveBeenCalled();
  });
});

describe("deleteBookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 指定 ID を削除して {} を返す", async () => {
    mockBookmarkDeleteMany.mockResolvedValue({ count: 2 });

    const result = await deleteBookmarks(userId, ["bm_1", "bm_2"]);

    expect(result).toEqual({});
    expect(mockBookmarkDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["bm_1", "bm_2"] }, userId },
    });
  });

  it("userId フィルタにより他ユーザーのブックマークは削除されない", async () => {
    mockBookmarkDeleteMany.mockResolvedValue({ count: 1 });

    await deleteBookmarks(userId, ["bm_1", "bm_other"]);

    expect(mockBookmarkDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["bm_1", "bm_other"] }, userId },
    });
  });
});

describe("bulkAddTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 有効なブックマーク・タグに対して createMany を呼んで {} を返す", async () => {
    mockBookmarkFindMany.mockResolvedValue([{ id: "bm_1" }, { id: "bm_2" }] as never);
    mockTagFindMany.mockResolvedValue([{ id: "tag_1" }] as never);
    mockBookmarkTagCreateMany.mockResolvedValue({ count: 2 });

    const result = await bulkAddTags(userId, ["bm_1", "bm_2"], ["tag_1"]);

    expect(result).toEqual({});
    expect(mockBookmarkTagCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it("bookmarkIds が空の場合は createMany を呼ばず {} を返す", async () => {
    const result = await bulkAddTags(userId, [], ["tag_1"]);

    expect(result).toEqual({});
    expect(mockBookmarkTagCreateMany).not.toHaveBeenCalled();
  });

  it("tagIds が空の場合は createMany を呼ばず {} を返す", async () => {
    const result = await bulkAddTags(userId, ["bm_1"], []);

    expect(result).toEqual({});
    expect(mockBookmarkTagCreateMany).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマーク・タグは userId フィルタで除外される", async () => {
    mockBookmarkFindMany.mockResolvedValue([] as never);
    mockTagFindMany.mockResolvedValue([] as never);

    const result = await bulkAddTags(userId, ["bm_other"], ["tag_other"]);

    expect(result).toEqual({});
    expect(mockBookmarkTagCreateMany).not.toHaveBeenCalled();
  });
});
