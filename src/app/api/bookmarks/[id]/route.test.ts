// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PUT } from "./route";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    bookmark: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const mockCurrentUser = vi.mocked(currentUser);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockBookmarkFindUnique = vi.mocked(prisma.bookmark.findUnique);
const mockBookmarkUpdate = vi.mocked(prisma.bookmark.update);
const mockBookmarkDelete = vi.mocked(prisma.bookmark.delete);

const clerkUser = { id: "clerk_123" };
const dbUser = {
  id: "user_1",
  clerkId: "clerk_123",
  email: "test@example.com",
  name: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const bookmark = {
  id: "bm_1",
  userId: "user_1",
  url: "https://example.com",
  title: "Example",
  memo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const otherBookmark = { ...bookmark, userId: "user_other" };

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PUT /api/bookmarks/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeRequest = (body: unknown) =>
    new Request("http://localhost/api/bookmarks/bm_1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("ブックマークを更新して 200 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindUnique.mockResolvedValue(bookmark);
    mockBookmarkUpdate.mockResolvedValue({ ...bookmark, title: "Updated" });

    const res = await PUT(makeRequest({ title: "Updated" }), makeParams("bm_1"));
    expect(res.status).toBe(200);
  });

  it("未認証の場合 401 を返す", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const res = await PUT(makeRequest({ title: "Updated" }), makeParams("bm_1"));
    expect(res.status).toBe(401);
  });

  it("他ユーザーのブックマークへのアクセスは 403 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark);

    const res = await PUT(makeRequest({ title: "Updated" }), makeParams("bm_1"));
    expect(res.status).toBe(403);
  });

  it("存在しないブックマークは 404 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindUnique.mockResolvedValue(null);

    const res = await PUT(makeRequest({ title: "Updated" }), makeParams("bm_1"));
    expect(res.status).toBe(404);
  });

  it("バリデーションエラーは 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindUnique.mockResolvedValue(bookmark);

    const res = await PUT(makeRequest({ url: "not-a-url" }), makeParams("bm_1"));
    expect(res.status).toBe(400);
  });

  it("javascript: スキームの URL は 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindUnique.mockResolvedValue(bookmark);

    const res = await PUT(makeRequest({ url: "javascript:alert(1)" }), makeParams("bm_1"));
    expect(res.status).toBe(400);
  });

  it("タイトルが 201 字以上の場合 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindUnique.mockResolvedValue(bookmark);

    const res = await PUT(makeRequest({ title: "a".repeat(201) }), makeParams("bm_1"));
    expect(res.status).toBe(400);
  });

  it("memo が 1001 字以上の場合 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindUnique.mockResolvedValue(bookmark);

    const res = await PUT(makeRequest({ memo: "a".repeat(1001) }), makeParams("bm_1"));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/bookmarks/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeRequest = () =>
    new Request("http://localhost/api/bookmarks/bm_1", { method: "DELETE" });

  it("ブックマークを削除して 200 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindUnique.mockResolvedValue(bookmark);
    mockBookmarkDelete.mockResolvedValue(bookmark);

    const res = await DELETE(makeRequest(), makeParams("bm_1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ message: "deleted" });
  });

  it("未認証の場合 401 を返す", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const res = await DELETE(makeRequest(), makeParams("bm_1"));
    expect(res.status).toBe(401);
  });

  it("他ユーザーのブックマークへのアクセスは 403 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindUnique.mockResolvedValue(otherBookmark);

    const res = await DELETE(makeRequest(), makeParams("bm_1"));
    expect(res.status).toBe(403);
  });

  it("存在しないブックマークは 404 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindUnique.mockResolvedValue(null);

    const res = await DELETE(makeRequest(), makeParams("bm_1"));
    expect(res.status).toBe(404);
  });
});
