// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "./route";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    bookmark: { count: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const mockCurrentUser = vi.mocked(currentUser);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockBookmarkCount = vi.mocked(prisma.bookmark.count);
const mockTransaction = vi.mocked(prisma.$transaction);

const clerkUser = { id: "clerk_123" };
const dbUser = {
  id: "user_1",
  clerkId: "clerk_123",
  email: "test@example.com",
  name: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeRequest = (body: unknown) =>
  new Request("http://localhost/api/bookmarks/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("PATCH /api/bookmarks/reorder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("並び順を更新して 200 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockBookmarkCount.mockResolvedValue(2);
    mockTransaction.mockResolvedValue([]);

    const res = await PATCH(makeRequest({ ids: ["bm_1", "bm_2"] }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("未認証の場合 401 を返す", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ ids: ["bm_1"] }));
    expect(res.status).toBe(401);
  });

  it("ids が空の場合 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);

    const res = await PATCH(makeRequest({ ids: [] }));
    expect(res.status).toBe(400);
  });

  it("他ユーザーのブックマーク ID が含まれる場合 403 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    // 送信した2件のうち1件しか自分のものでない
    mockBookmarkCount.mockResolvedValue(1);

    const res = await PATCH(makeRequest({ ids: ["bm_1", "bm_other"] }));
    expect(res.status).toBe(403);
  });

  it("ids が配列でない場合 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);

    const res = await PATCH(makeRequest({ ids: "bm_1" }));
    expect(res.status).toBe(400);
  });
});
