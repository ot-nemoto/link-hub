// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/bookmarks", () => ({
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  updateBookmarkTags: vi.fn(),
  reorderBookmarks: vi.fn(),
  deleteBookmark: vi.fn(),
  deleteBookmarks: vi.fn(),
  bulkAddTags: vi.fn(),
}));

vi.mock("@/lib/tags", () => ({
  createTag: vi.fn(),
  deleteTag: vi.fn(),
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import * as libBookmarks from "@/lib/bookmarks";
import * as libTags from "@/lib/tags";

const mockRedirect = vi.mocked(redirect).mockImplementation(() => {
  throw new Error("NEXT_REDIRECT");
});
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockGetSession = vi.mocked(getSession);
const mockLibCreateBookmark = vi.mocked(libBookmarks.createBookmark);
const mockLibUpdateBookmark = vi.mocked(libBookmarks.updateBookmark);
const mockLibUpdateBookmarkTags = vi.mocked(libBookmarks.updateBookmarkTags);
const mockLibReorderBookmarks = vi.mocked(libBookmarks.reorderBookmarks);
const mockLibDeleteBookmark = vi.mocked(libBookmarks.deleteBookmark);
const mockLibDeleteBookmarks = vi.mocked(libBookmarks.deleteBookmarks);
const mockLibBulkAddTags = vi.mocked(libBookmarks.bulkAddTags);
const mockLibCreateTag = vi.mocked(libTags.createTag);
const mockLibDeleteTag = vi.mocked(libTags.deleteTag);

const session = { user: { id: "user_1", name: "Test", email: "test@example.com" } };
const bookmarkData = { url: "https://example.com", title: "Example", memo: "" };

describe("createBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: lib を呼び revalidatePath して結果を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibCreateBookmark.mockResolvedValue({});

    const result = await createBookmark(bookmarkData);

    expect(mockLibCreateBookmark).toHaveBeenCalledWith("user_1", bookmarkData);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({});
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(createBookmark(bookmarkData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibCreateBookmark).not.toHaveBeenCalled();
  });
});

describe("updateBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: lib を呼び revalidatePath して結果を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibUpdateBookmark.mockResolvedValue({});

    const result = await updateBookmark("bm_1", bookmarkData);

    expect(mockLibUpdateBookmark).toHaveBeenCalledWith("user_1", "bm_1", bookmarkData);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({});
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(updateBookmark("bm_1", bookmarkData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibUpdateBookmark).not.toHaveBeenCalled();
  });
});

describe("updateBookmarkTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: lib を呼び revalidatePath して結果を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibUpdateBookmarkTags.mockResolvedValue({});

    const result = await updateBookmarkTags("bm_1", ["tag_1"]);

    expect(mockLibUpdateBookmarkTags).toHaveBeenCalledWith("user_1", "bm_1", ["tag_1"]);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({});
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(updateBookmarkTags("bm_1", [])).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibUpdateBookmarkTags).not.toHaveBeenCalled();
  });
});

describe("reorderBookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: lib を呼び revalidatePath して結果を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibReorderBookmarks.mockResolvedValue({});

    const result = await reorderBookmarks(["bm_1", "bm_2"]);

    expect(mockLibReorderBookmarks).toHaveBeenCalledWith("user_1", ["bm_1", "bm_2"]);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({});
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(reorderBookmarks(["bm_1"])).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibReorderBookmarks).not.toHaveBeenCalled();
  });
});

describe("deleteBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  const prevState = {};

  it("正常系: lib を呼び revalidatePath して結果を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibDeleteBookmark.mockResolvedValue({});

    const result = await deleteBookmark("bm_1", prevState);

    expect(mockLibDeleteBookmark).toHaveBeenCalledWith("user_1", "bm_1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({});
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(deleteBookmark("bm_1", prevState)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibDeleteBookmark).not.toHaveBeenCalled();
  });
});

describe("deleteBookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: lib を呼び revalidatePath して結果を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibDeleteBookmarks.mockResolvedValue({});

    const result = await deleteBookmarks(["bm_1", "bm_2"]);

    expect(mockLibDeleteBookmarks).toHaveBeenCalledWith("user_1", ["bm_1", "bm_2"]);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({});
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(deleteBookmarks(["bm_1"])).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibDeleteBookmarks).not.toHaveBeenCalled();
  });
});

describe("createTag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: lib を呼び revalidatePath して結果を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibCreateTag.mockResolvedValue({ tag: { id: "tag_1", name: "React" } });

    const result = await createTag("React");

    expect(mockLibCreateTag).toHaveBeenCalledWith("user_1", "React");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({ tag: { id: "tag_1", name: "React" } });
  });

  it("conflict の場合は revalidatePath を呼ばない", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibCreateTag.mockResolvedValue({ conflict: true, tag: { id: "tag_1", name: "React" } });

    const result = await createTag("React");

    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(result).toEqual({ conflict: true, tag: { id: "tag_1", name: "React" } });
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(createTag("React")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibCreateTag).not.toHaveBeenCalled();
  });
});

describe("deleteTag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: lib を呼び revalidatePath して結果を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibDeleteTag.mockResolvedValue({});

    const result = await deleteTag("tag_1");

    expect(mockLibDeleteTag).toHaveBeenCalledWith("user_1", "tag_1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({});
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(deleteTag("tag_1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibDeleteTag).not.toHaveBeenCalled();
  });
});

describe("bulkAddTags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: lib を呼び revalidatePath して結果を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibBulkAddTags.mockResolvedValue({});

    const result = await bulkAddTags(["bm_1", "bm_2"], ["tag_1"]);

    expect(mockLibBulkAddTags).toHaveBeenCalledWith("user_1", ["bm_1", "bm_2"], ["tag_1"]);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({});
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(bulkAddTags(["bm_1"], ["tag_1"])).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibBulkAddTags).not.toHaveBeenCalled();
  });
});
