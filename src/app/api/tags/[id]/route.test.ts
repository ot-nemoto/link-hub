// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "./route";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    tag: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const mockCurrentUser = vi.mocked(currentUser);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockTagFindUnique = vi.mocked(prisma.tag.findUnique);
const mockTagDelete = vi.mocked(prisma.tag.delete);

const clerkUser = { id: "clerk_123" };
const dbUser = {
  id: "user_1",
  clerkId: "clerk_123",
  email: "test@example.com",
  name: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const tag = { id: "tag_1", name: "TypeScript", userId: "user_1", createdAt: new Date() };

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("DELETE /api/tags/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("タグを削除して 200 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockTagFindUnique.mockResolvedValue(tag as never);
    mockTagDelete.mockResolvedValue(tag as never);

    const res = await DELETE(new Request("http://localhost"), makeParams("tag_1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("deleted");
  });

  it("未認証の場合 401 を返す", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost"), makeParams("tag_1"));
    expect(res.status).toBe(401);
  });

  it("タグが存在しない場合 404 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockTagFindUnique.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost"), makeParams("tag_999"));
    expect(res.status).toBe(404);
  });

  it("他ユーザーのタグの場合 403 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockTagFindUnique.mockResolvedValue({ ...tag, userId: "other_user" } as never);

    const res = await DELETE(new Request("http://localhost"), makeParams("tag_1"));
    expect(res.status).toBe(403);
  });
});
