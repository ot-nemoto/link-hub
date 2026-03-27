// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// DATABASE_URL モック
vi.stubEnv("DATABASE_URL", "postgresql://test");

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const mockCurrentUser = vi.mocked(currentUser);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpsert = vi.mocked(prisma.user.upsert);

const clerkUser = {
  id: "clerk_123",
  fullName: "Test User",
  emailAddresses: [{ emailAddress: "test@example.com" }],
};

const dbUser = {
  id: "cuid_123",
  clerkId: "clerk_123",
  email: "test@example.com",
  name: "Test User",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("POST /api/users/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("新規ユーザーを作成して 201 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue(dbUser);

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({
      id: dbUser.id,
      clerkId: dbUser.clerkId,
      email: dbUser.email,
      name: dbUser.name,
    });
  });

  it("既存ユーザーを更新して 200 を返す", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser as never);
    mockFindUnique.mockResolvedValue(dbUser);
    mockUpsert.mockResolvedValue(dbUser);

    const res = await POST();

    expect(res.status).toBe(200);
  });

  it("未認証の場合 401 を返す", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("メールアドレスがない場合 400 を返す", async () => {
    mockCurrentUser.mockResolvedValue({
      ...clerkUser,
      emailAddresses: [],
    } as never);

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Email not found" });
  });
});
