// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    tag: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const mockCurrentUser = vi.mocked(currentUser);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockTagFindMany = vi.mocked(prisma.tag.findMany);
const mockTagFindUnique = vi.mocked(prisma.tag.findUnique);
const mockTagCreate = vi.mocked(prisma.tag.create);

const clerkUser = { id: "clerk_123" };
const dbUser = {
  id: "user_1",
  clerkId: "clerk_123",
  email: "test@example.com",
  name: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const tag = { id: "tag_1", name: "TypeScript", createdAt: new Date() };

describe("GET /api/tags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("タグ一覧を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockTagFindMany.mockResolvedValue([tag] as never);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("TypeScript");
  });

  it("未認証の場合 401 を返す", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("自分のタグのみ取得するクエリが発行される", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockTagFindMany.mockResolvedValue([tag] as never);

    await GET();

    expect(mockTagFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: dbUser.id } }),
    );
  });
});

describe("POST /api/tags", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeRequest = (body: unknown) =>
    new Request("http://localhost/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("タグを作成して 201 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockTagFindUnique.mockResolvedValue(null);
    mockTagCreate.mockResolvedValue(tag as never);

    const res = await POST(makeRequest({ name: "TypeScript" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.name).toBe("TypeScript");
  });

  it("未認証の場合 401 を返す", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const res = await POST(makeRequest({ name: "TypeScript" }));
    expect(res.status).toBe(401);
  });

  it("name が空の場合 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);

    const res = await POST(makeRequest({ name: "" }));
    expect(res.status).toBe(400);
  });

  it("name が 51 文字以上の場合 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);

    const res = await POST(makeRequest({ name: "a".repeat(51) }));
    expect(res.status).toBe(400);
  });

  it("同名タグが存在する場合 409 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockTagFindUnique.mockResolvedValue(tag as never);

    const res = await POST(makeRequest({ name: "TypeScript" }));
    expect(res.status).toBe(409);
  });

  it("重複チェックが自分のユーザー単位で行われる", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockUserFindUnique.mockResolvedValue(dbUser);
    mockTagFindUnique.mockResolvedValue(null);
    mockTagCreate.mockResolvedValue(tag as never);

    await POST(makeRequest({ name: "TypeScript" }));

    expect(mockTagFindUnique).toHaveBeenCalledWith({
      where: { userId_name: { userId: dbUser.id, name: "TypeScript" } },
    });
  });
});
