// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBookmark,
  deleteBookmark,
  deleteBookmarks,
  emptyTrash,
  getBookmarks,
  getDeletedBookmarks,
  moveBookmark,
  reorderBookmarks,
  restoreBookmark,
  updateBookmark,
} from "./bookmarks";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bookmark: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    tag: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
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
const mockBookmarkUpdateMany = vi.mocked(prisma.bookmark.updateMany);
const mockBookmarkDelete = vi.mocked(prisma.bookmark.delete);
const mockBookmarkDeleteMany = vi.mocked(prisma.bookmark.deleteMany);
const mockBookmarkAggregate = vi.mocked(prisma.bookmark.aggregate);
const mockBookmarkCount = vi.mocked(prisma.bookmark.count);
const mockTagFindFirst = vi.mocked(prisma.tag.findFirst);
const mockTransaction = vi.mocked(prisma.$transaction);

const userId = "user_1";
const bookmark = {
  id: "bm_1",
  userId,
  url: "https://example.com",
  title: "Example",
  memo: null,
  ogImage: null,
  hideOgImage: false,
  sortOrder: 0,
  tagId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const otherBookmark = { ...bookmark, userId: "user_other" };
const bookmarkData = { url: "https://example.com", title: "Example", memo: "" };

describe("getBookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: userId かつ未削除でフィルタして返す", async () => {
    mockBookmarkFindMany.mockResolvedValue([bookmark] as never);

    const result = await getBookmarks(userId);

    expect(mockBookmarkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId, deletedAt: null } }),
    );
    expect(result).toEqual([bookmark]);
  });

  it("キーワード検索: query があれば OR 条件を付加する", async () => {
    mockBookmarkFindMany.mockResolvedValue([] as never);

    await getBookmarks(userId, "test");

    expect(mockBookmarkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null, OR: expect.any(Array) }),
      }),
    );
  });
});

describe("getDeletedBookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: userId かつ削除済み（deletedAt != null）を返す", async () => {
    const deleted = { ...bookmark, deletedAt: new Date() };
    mockBookmarkFindMany.mockResolvedValue([deleted] as never);

    const result = await getDeletedBookmarks(userId);

    expect(mockBookmarkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId, deletedAt: { not: null } } }),
    );
    expect(result).toEqual([deleted]);
  });
});

describe("createBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ブックマークを作成して作成レコードを返す", async () => {
    mockBookmarkAggregate.mockResolvedValue({ _max: { sortOrder: 3 } } as never);
    mockBookmarkCreate.mockResolvedValue(bookmark);

    const result = await createBookmark(userId, bookmarkData);

    expect(result).toEqual({ bookmark });
    expect(mockBookmarkAggregate).toHaveBeenCalledWith({
      where: { userId },
      _max: { sortOrder: true },
    });
    expect(mockBookmarkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId, url: "https://example.com", sortOrder: 4 }),
      }),
    );
  });

  it("ブックマークが0件のとき sortOrder が 0 になる", async () => {
    mockBookmarkAggregate.mockResolvedValue({ _max: { sortOrder: null } } as never);
    mockBookmarkCreate.mockResolvedValue(bookmark);

    await createBookmark(userId, bookmarkData);

    expect(mockBookmarkCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sortOrder: 0 }) }),
    );
  });

  it("tagId を指定すると自ユーザーのタグか検証してセットする", async () => {
    mockBookmarkAggregate.mockResolvedValue({ _max: { sortOrder: 0 } } as never);
    mockTagFindFirst.mockResolvedValue({ id: "tag_1" } as never);
    mockBookmarkCreate.mockResolvedValue(bookmark);

    await createBookmark(userId, { ...bookmarkData, tagId: "tag_1" });

    expect(mockTagFindFirst).toHaveBeenCalledWith({
      where: { id: "tag_1", userId },
      select: { id: true },
    });
    expect(mockBookmarkCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tagId: "tag_1" }) }),
    );
  });

  it("他ユーザーの tagId は null にフォールバックする", async () => {
    mockBookmarkAggregate.mockResolvedValue({ _max: { sortOrder: 0 } } as never);
    mockTagFindFirst.mockResolvedValue(null);
    mockBookmarkCreate.mockResolvedValue(bookmark);

    await createBookmark(userId, { ...bookmarkData, tagId: "tag_other" });

    expect(mockBookmarkCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tagId: null }) }),
    );
  });
});

describe("updateBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ブックマークを更新して更新レコードを返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    const updated = { ...bookmark, title: "Updated" };
    mockBookmarkUpdate.mockResolvedValue(updated);

    const result = await updateBookmark(userId, "bm_1", { ...bookmarkData, title: "Updated" });

    expect(result).toEqual({ bookmark: updated });
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

  it("hideOgImage が指定された場合は update データに含める", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    await updateBookmark(userId, "bm_1", { ...bookmarkData, hideOgImage: true });

    expect(mockBookmarkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hideOgImage: true }),
      }),
    );
  });

  it("hideOgImage が undefined の場合は update データに含めない（既存値を保持）", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    await updateBookmark(userId, "bm_1", { ...bookmarkData, hideOgImage: undefined });

    const callArg = mockBookmarkUpdate.mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty("hideOgImage");
  });

  it("memo が undefined の場合は update データに含めない（既存値を保持）", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    await updateBookmark(userId, "bm_1", { url: "https://example.com", title: "x" });

    const callArg = mockBookmarkUpdate.mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty("memo");
  });

  it("sortOrder を指定すると update データに含める（moveBookmark 相当）", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockTagFindFirst.mockResolvedValue({ id: "tag_1" } as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    await updateBookmark(userId, "bm_1", {
      url: "https://example.com",
      title: "x",
      tagId: "tag_1",
      sortOrder: 2,
    });

    expect(mockBookmarkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tagId: "tag_1", sortOrder: 2 }),
      }),
    );
  });

  it("sortOrder が undefined の場合は update データに含めない", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    await updateBookmark(userId, "bm_1", { url: "https://example.com", title: "x" });

    const callArg = mockBookmarkUpdate.mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty("sortOrder");
  });
});

describe("moveBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: tagId と sortOrder を更新して {} を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockTagFindFirst.mockResolvedValue({ id: "tag_1" } as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    const result = await moveBookmark(userId, "bm_1", "tag_1", 2);

    expect(result).toEqual({});
    expect(mockBookmarkUpdate).toHaveBeenCalledWith({
      where: { id: "bm_1" },
      data: { tagId: "tag_1", sortOrder: 2 },
    });
  });

  it("tagId が null の場合は未分類に移動する", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    const result = await moveBookmark(userId, "bm_1", null, 0);

    expect(result).toEqual({});
    expect(mockBookmarkUpdate).toHaveBeenCalledWith({
      where: { id: "bm_1" },
      data: { tagId: null, sortOrder: 0 },
    });
  });

  it("存在しないブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(null);

    const result = await moveBookmark(userId, "bm_not_exist", null, 0);

    expect(result).toEqual({ error: "ブックマークが見つかりません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark as never);

    const result = await moveBookmark(userId, "bm_1", null, 0);

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });

  it("存在しないカテゴリは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockTagFindFirst.mockResolvedValue(null);

    const result = await moveBookmark(userId, "bm_1", "tag_not_exist", 0);

    expect(result).toEqual({ error: "カテゴリが見つかりません" });
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

  it("重複 ID があっても所有していれば誤って 403 にしない（ユニーク基準で判定）", async () => {
    mockBookmarkCount.mockResolvedValue(1);
    mockTransaction.mockResolvedValue([]);

    const result = await reorderBookmarks(userId, ["bm_1", "bm_1"]);

    expect(result).toEqual({});
    expect(mockBookmarkCount).toHaveBeenCalledWith({ where: { id: { in: ["bm_1"] }, userId } });
    expect(mockTransaction).toHaveBeenCalled();
  });
});

describe("deleteBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ソフトデリート（deletedAt を設定）して {} を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(bookmark as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    const result = await deleteBookmark(userId, "bm_1");

    expect(result).toEqual({});
    expect(mockBookmarkDelete).not.toHaveBeenCalled();
    expect(mockBookmarkUpdate).toHaveBeenCalledWith({
      where: { id: "bm_1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("存在しないブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(null);

    const result = await deleteBookmark(userId, "bm_not_exist");

    expect(result).toEqual({ error: "ブックマークが見つかりません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark as never);

    const result = await deleteBookmark(userId, "bm_1");

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });
});

describe("deleteBookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 指定 ID をソフトデリートして {} を返す", async () => {
    mockBookmarkUpdateMany.mockResolvedValue({ count: 2 });

    const result = await deleteBookmarks(userId, ["bm_1", "bm_2"]);

    expect(result).toEqual({});
    expect(mockBookmarkDeleteMany).not.toHaveBeenCalled();
    expect(mockBookmarkUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["bm_1", "bm_2"] }, userId },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("userId フィルタにより他ユーザーのブックマークは対象外", async () => {
    mockBookmarkUpdateMany.mockResolvedValue({ count: 1 });

    await deleteBookmarks(userId, ["bm_1", "bm_other"]);

    expect(mockBookmarkUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["bm_1", "bm_other"] }, userId },
      data: { deletedAt: expect.any(Date) },
    });
  });
});

describe("restoreBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: deletedAt を null に戻して復元レコードを返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue({ ...bookmark, deletedAt: new Date() } as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    const result = await restoreBookmark(userId, "bm_1");

    expect(result).toEqual({ bookmark });
    expect(mockBookmarkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "bm_1" }, data: { deletedAt: null } }),
    );
  });

  it("存在しないブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(null);

    const result = await restoreBookmark(userId, "bm_not_exist");

    expect(result).toEqual({ error: "ブックマークが見つかりません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマークは error を返す", async () => {
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark as never);

    const result = await restoreBookmark(userId, "bm_1");

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });
});

describe("emptyTrash", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 削除済み（deletedAt != null）を物理削除して {} を返す", async () => {
    mockBookmarkDeleteMany.mockResolvedValue({ count: 3 });

    const result = await emptyTrash(userId);

    expect(result).toEqual({});
    expect(mockBookmarkDeleteMany).toHaveBeenCalledWith({
      where: { userId, deletedAt: { not: null } },
    });
  });
});
