// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBookmark,
  deleteBookmark,
  deleteBookmarks,
  updateBookmark,
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
    },
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
const mockBookmarkFindUnique = vi.mocked(prisma.bookmark.findUnique);
const mockBookmarkUpdate = vi.mocked(prisma.bookmark.update);
const mockBookmarkDelete = vi.mocked(prisma.bookmark.delete);
const mockBookmarkDeleteMany = vi.mocked(prisma.bookmark.deleteMany);

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
    mockBookmarkCreate.mockResolvedValue(bookmark);

    const result = await createBookmark(bookmarkData);

    expect(result).toEqual({});
    expect(mockBookmarkCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user_1", url: "https://example.com" }),
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
