// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import {
  createBookmark,
  deleteBookmark,
  deleteBookmarks,
  updateBookmark,
  updateBookmarkTags,
  reorderBookmarks,
  createTag,
  deleteTag,
  bulkAddTags,
} from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bookmark: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    tag: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    bookmarkTag: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockRedirect = vi.mocked(redirect).mockImplementation(() => {
  throw new Error("NEXT_REDIRECT");
});
const mockGetSession = vi.mocked(getSession);
const mockBookmarkCreate = vi.mocked(prisma.bookmark.create);
const mockBookmarkAggregate = vi.mocked(prisma.bookmark.aggregate);
const mockBookmarkFindUnique = vi.mocked(prisma.bookmark.findUnique);
const mockBookmarkUpdate = vi.mocked(prisma.bookmark.update);
const mockBookmarkDelete = vi.mocked(prisma.bookmark.delete);
const mockBookmarkDeleteMany = vi.mocked(prisma.bookmark.deleteMany);
const mockBookmarkCount = vi.mocked(prisma.bookmark.count);
const mockBookmarkFindMany = vi.mocked(prisma.bookmark.findMany);
const mockTagFindUnique = vi.mocked(prisma.tag.findUnique);
const mockTagFindMany = vi.mocked(prisma.tag.findMany);
const mockTagCreate = vi.mocked(prisma.tag.create);
const mockTagDelete = vi.mocked(prisma.tag.delete);
const mockBookmarkTagCreateMany = vi.mocked(prisma.bookmarkTag.createMany);
const mockTransaction = vi.mocked(prisma.$transaction);

const session = { user: { id: "user_1", name: "Test", email: "test@example.com" } };
const bookmark = {
  id: "bm_1",
  userId: "user_1",
  url: "https://example.com",
  title: "Example",
  memo: null,
  ogImage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const otherBookmark = { ...bookmark, userId: "user_other" };
const bookmarkData = { url: "https://example.com", title: "Example", memo: "" };

describe("createBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ブックマークを作成して {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkAggregate.mockResolvedValue({ _max: { sortOrder: 3 } } as never);
    mockBookmarkCreate.mockResolvedValue(bookmark);

    const result = await createBookmark(bookmarkData);

    expect(result).toEqual({});
    // aggregate がユーザー単位で呼ばれていること
    expect(mockBookmarkAggregate).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      _max: { sortOrder: true },
    });
    expect(mockBookmarkCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user_1", url: "https://example.com", sortOrder: 4 }),
    });
  });

  it("正常系: ブックマークが0件のとき sortOrder が 0 になる", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkAggregate.mockResolvedValue({ _max: { sortOrder: null } } as never);
    mockBookmarkCreate.mockResolvedValue(bookmark);

    await createBookmark(bookmarkData);

    // aggregate がユーザー単位で呼ばれていること
    expect(mockBookmarkAggregate).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      _max: { sortOrder: true },
    });
    expect(mockBookmarkCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 0 }),
    });
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(createBookmark(bookmarkData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockBookmarkCreate).not.toHaveBeenCalled();
  });
});

describe("updateBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ブックマークを更新して {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindUnique.mockResolvedValue(bookmark);
    mockBookmarkUpdate.mockResolvedValue({ ...bookmark, title: "Updated" });

    const result = await updateBookmark("bm_1", { ...bookmarkData, title: "Updated" });

    expect(result).toEqual({});
    expect(mockBookmarkUpdate).toHaveBeenCalled();
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(updateBookmark("bm_1", bookmarkData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockBookmarkFindUnique).not.toHaveBeenCalled();
  });

  it("存在しないブックマークは error を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindUnique.mockResolvedValue(null);

    const result = await updateBookmark("bm_not_exist", bookmarkData);

    expect(result).toEqual({ error: "ブックマークが見つかりません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマークは error を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark);

    const result = await updateBookmark("bm_1", bookmarkData);

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });

  it("ogImage が undefined の場合は update データに ogImage を含めない（既存値を保持）", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindUnique.mockResolvedValue(bookmark);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    await updateBookmark("bm_1", { ...bookmarkData, ogImage: undefined });

    expect(mockBookmarkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ ogImage: expect.anything() }),
      }),
    );
  });
});

describe("deleteBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  const prevState = {};

  it("正常系: ブックマークを削除して {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindUnique.mockResolvedValue(bookmark);
    mockBookmarkDelete.mockResolvedValue(bookmark);

    const result = await deleteBookmark("bm_1", prevState);

    expect(result).toEqual({});
    expect(mockBookmarkDelete).toHaveBeenCalledWith({ where: { id: "bm_1" } });
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(deleteBookmark("bm_1", prevState)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockBookmarkFindUnique).not.toHaveBeenCalled();
  });

  it("存在しないブックマークは error を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindUnique.mockResolvedValue(null);

    const result = await deleteBookmark("bm_not_exist", prevState);

    expect(result).toEqual({ error: "ブックマークが見つかりません" });
    expect(mockBookmarkDelete).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマークは error を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark);

    const result = await deleteBookmark("bm_1", prevState);

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockBookmarkDelete).not.toHaveBeenCalled();
  });
});

describe("deleteBookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 指定 ID を削除して {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkDeleteMany.mockResolvedValue({ count: 2 });

    const result = await deleteBookmarks(["bm_1", "bm_2"]);

    expect(result).toEqual({});
    expect(mockBookmarkDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["bm_1", "bm_2"] }, userId: "user_1" },
    });
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(deleteBookmarks(["bm_1"])).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockBookmarkDeleteMany).not.toHaveBeenCalled();
  });

  it("userId フィルタにより他ユーザーのブックマークは削除されない", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkDeleteMany.mockResolvedValue({ count: 1 });

    await deleteBookmarks(["bm_1", "bm_other"]);

    expect(mockBookmarkDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["bm_1", "bm_other"] }, userId: "user_1" },
    });
  });
});

describe("updateBookmarkTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ブックマークのタグを上書きして {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindUnique.mockResolvedValue(bookmark);
    mockTagFindMany.mockResolvedValue([{ id: "tag_1" }, { id: "tag_2" }] as never);
    mockBookmarkUpdate.mockResolvedValue(bookmark);

    const result = await updateBookmarkTags("bm_1", ["tag_1", "tag_2"]);

    expect(result).toEqual({});
    expect(mockBookmarkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "bm_1" } }),
    );
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(updateBookmarkTags("bm_1", [])).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("存在しないブックマークは error を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindUnique.mockResolvedValue(null);

    const result = await updateBookmarkTags("bm_not_exist", ["tag_1"]);

    expect(result).toEqual({ error: "ブックマークが見つかりません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマークは error を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark);

    const result = await updateBookmarkTags("bm_1", ["tag_1"]);

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockBookmarkUpdate).not.toHaveBeenCalled();
  });
});

describe("reorderBookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 全件自ユーザー所有なら並び替えて {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkCount.mockResolvedValue(2);
    mockTransaction.mockResolvedValue([]);

    const result = await reorderBookmarks(["bm_1", "bm_2"]);

    expect(result).toEqual({});
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(reorderBookmarks(["bm_1"])).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("他ユーザーのブックマークが含まれる場合は error を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    // count が ids.length より少ない → 他ユーザーのIDが混入
    mockBookmarkCount.mockResolvedValue(1);

    const result = await reorderBookmarks(["bm_1", "bm_other"]);

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe("createTag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: タグを作成して { tag } を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockTagFindUnique.mockResolvedValue(null);
    mockTagCreate.mockResolvedValue({ id: "tag_1", name: "React" } as never);

    const result = await createTag("React");

    expect(result).toEqual({ tag: { id: "tag_1", name: "React" } });
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(createTag("React")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("名前が空の場合は error を返す", async () => {
    mockGetSession.mockResolvedValue(session);

    const result = await createTag("");

    expect(result).toEqual({ error: "タグ名が不正です" });
    expect(mockTagCreate).not.toHaveBeenCalled();
  });

  it("名前が51文字以上の場合は error を返す", async () => {
    mockGetSession.mockResolvedValue(session);

    const result = await createTag("a".repeat(51));

    expect(result).toEqual({ error: "タグ名が不正です" });
    expect(mockTagCreate).not.toHaveBeenCalled();
  });

  it("既存タグと重複する場合は { conflict: true, tag } を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockTagFindUnique.mockResolvedValue({ id: "tag_1", name: "React", userId: "user_1" } as never);

    const result = await createTag("React");

    expect(result).toEqual({ conflict: true, tag: { id: "tag_1", name: "React" } });
    expect(mockTagCreate).not.toHaveBeenCalled();
  });

  it("P2002レース条件の場合は { conflict: true, tag } を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    // findUnique は null（重複なし）、createでP2002が発生
    mockTagFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "tag_1", name: "React", userId: "user_1" } as never);
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "7.5.0",
    });
    mockTagCreate.mockRejectedValue(p2002);

    const result = await createTag("React");

    expect(result).toEqual({ conflict: true, tag: { id: "tag_1", name: "React" } });
  });
});

describe("deleteTag", () => {
  beforeEach(() => vi.clearAllMocks());

  const tag = { id: "tag_1", name: "React", userId: "user_1" };
  const otherTag = { ...tag, userId: "user_other" };

  it("正常系: タグを削除して {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockTagFindUnique.mockResolvedValue(tag as never);
    mockTagDelete.mockResolvedValue(tag as never);

    const result = await deleteTag("tag_1");

    expect(result).toEqual({});
    expect(mockTagDelete).toHaveBeenCalledWith({ where: { id: "tag_1" } });
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(deleteTag("tag_1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("存在しないタグは error を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockTagFindUnique.mockResolvedValue(null);

    const result = await deleteTag("tag_not_exist");

    expect(result).toEqual({ error: "タグが見つかりません" });
    expect(mockTagDelete).not.toHaveBeenCalled();
  });

  it("他ユーザーのタグは error を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockTagFindUnique.mockResolvedValue(otherTag as never);

    const result = await deleteTag("tag_1");

    expect(result).toEqual({ error: "権限がありません" });
    expect(mockTagDelete).not.toHaveBeenCalled();
  });
});

describe("bulkAddTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 有効なブックマーク・タグに対してcreateMany を呼んで {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockBookmarkFindMany.mockResolvedValue([{ id: "bm_1" }, { id: "bm_2" }] as never);
    mockTagFindMany.mockResolvedValue([{ id: "tag_1" }] as never);
    mockBookmarkTagCreateMany.mockResolvedValue({ count: 2 });

    const result = await bulkAddTags(["bm_1", "bm_2"], ["tag_1"]);

    expect(result).toEqual({});
    expect(mockBookmarkTagCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(bulkAddTags(["bm_1"], ["tag_1"])).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("bookmarkIds が空の場合は createMany を呼ばず {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);

    const result = await bulkAddTags([], ["tag_1"]);

    expect(result).toEqual({});
    expect(mockBookmarkTagCreateMany).not.toHaveBeenCalled();
  });

  it("tagIds が空の場合は createMany を呼ばず {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);

    const result = await bulkAddTags(["bm_1"], []);

    expect(result).toEqual({});
    expect(mockBookmarkTagCreateMany).not.toHaveBeenCalled();
  });

  it("他ユーザーのブックマーク・タグは userId フィルタで除外される", async () => {
    mockGetSession.mockResolvedValue(session);
    // 他ユーザーのIDは findMany で返されない
    mockBookmarkFindMany.mockResolvedValue([] as never);
    mockTagFindMany.mockResolvedValue([] as never);

    const result = await bulkAddTags(["bm_other"], ["tag_other"]);

    expect(result).toEqual({});
    expect(mockBookmarkTagCreateMany).not.toHaveBeenCalled();
  });
});
