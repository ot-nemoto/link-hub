// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    bookmark: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const mockCurrentUser = vi.mocked(currentUser);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockBookmarkFindMany = vi.mocked(prisma.bookmark.findMany);
const mockBookmarkCreate = vi.mocked(prisma.bookmark.create);

const clerkUser = { id: "clerk_123" };
const dbUser = { id: "user_1", clerkId: "clerk_123", email: "test@example.com", name: null, createdAt: new Date(), updatedAt: new Date() };
const bookmark = { id: "bm_1", userId: "user_1", url: "https://example.com", title: "Example", memo: null, createdAt: new Date(), updatedAt: new Date() };

describe("GET /api/bookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ブックマーク一覧を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkFindMany.mockResolvedValue([bookmark]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it("未認証の場合 401 を返す", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/bookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeRequest = (body: unknown) =>
    new Request("http://localhost/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("ブックマークを作成して 201 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkCreate.mockResolvedValue(bookmark);

    const res = await POST(makeRequest({ url: "https://example.com", title: "Example" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe(bookmark.id);
  });

  it("未認証の場合 401 を返す", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ url: "https://example.com", title: "Example" }));
    expect(res.status).toBe(401);
  });

  it("URL が不正な場合 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);

    const res = await POST(makeRequest({ url: "not-a-url", title: "Example" }));
    expect(res.status).toBe(400);
  });

  it("javascript: スキームの URL は 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);

    const res = await POST(makeRequest({ url: "javascript:alert(1)", title: "Example" }));
    expect(res.status).toBe(400);
  });

  it("タイトルが空の場合 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);

    const res = await POST(makeRequest({ url: "https://example.com", title: "" }));
    expect(res.status).toBe(400);
  });
});
