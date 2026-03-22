// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSession } from "./auth";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
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

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockCurrentUser = vi.mocked(currentUser);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserUpsert = vi.mocked(prisma.user.upsert);

const dbUser = {
  id: "user_1",
  clerkId: "clerk_123",
  email: "test@example.com",
  name: "Test User",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("getSession - モックバイパス", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    vi.stubEnv("NODE_ENV", "test");
  });

  it("MOCK_USER_ID が設定されている場合、DB からユーザーを取得して session を返す", async () => {
    vi.stubEnv("MOCK_USER_ID", "user_1");
    mockUserFindUnique.mockResolvedValue(dbUser);

    const session = await getSession();

    expect(session).toEqual({
      user: { id: "user_1", name: "Test User", email: "test@example.com" },
    });
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { id: "user_1" } });
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("MOCK_USER_ID に対応するユーザーが存在しない場合、null を返す", async () => {
    vi.stubEnv("MOCK_USER_ID", "not_exist");
    mockUserFindUnique.mockResolvedValue(null);

    const session = await getSession();

    expect(session).toBeNull();
  });

  it("MOCK_USER_EMAIL が設定されている場合、DB からユーザーを取得して session を返す", async () => {
    vi.stubEnv("MOCK_USER_EMAIL", "test@example.com");
    mockUserFindUnique.mockResolvedValue(dbUser);

    const session = await getSession();

    expect(session).toEqual({
      user: { id: "user_1", name: "Test User", email: "test@example.com" },
    });
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { email: "test@example.com" } });
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("MOCK_USER_EMAIL に対応するユーザーが存在しない場合、null を返す", async () => {
    vi.stubEnv("MOCK_USER_EMAIL", "not@exist.com");
    mockUserFindUnique.mockResolvedValue(null);

    const session = await getSession();

    expect(session).toBeNull();
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("DATABASE_URL", "postgresql://test");
    vi.stubEnv("NODE_ENV", "production");
  });

  it("認証済みでDBにユーザーが存在する場合、session を返す", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_123" } as never);
    mockUserFindUnique.mockResolvedValue(dbUser);

    const session = await getSession();

    expect(session).toEqual({
      user: { id: "user_1", name: "Test User", email: "test@example.com" },
    });
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { clerkId: "clerk_123" } });
  });

  it("DBにユーザーが存在しない場合、Clerkから取得してupsertし session を返す", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_123" } as never);
    mockUserFindUnique.mockResolvedValue(null);
    mockCurrentUser.mockResolvedValue({
      fullName: "New User",
      emailAddresses: [{ emailAddress: "new@example.com" }],
    } as never);
    mockUserUpsert.mockResolvedValue({ ...dbUser, email: "new@example.com", name: "New User" });

    const session = await getSession();

    expect(session).toEqual({
      user: { id: "user_1", name: "New User", email: "new@example.com" },
    });
    expect(mockUserUpsert).toHaveBeenCalled();
  });

  it("未認証（userId なし）の場合、null を返す", async () => {
    mockAuth.mockResolvedValue({ userId: null } as never);

    const session = await getSession();

    expect(session).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("DBにユーザーが存在せず、メールアドレスもない場合、null を返す", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_123" } as never);
    mockUserFindUnique.mockResolvedValue(null);
    mockCurrentUser.mockResolvedValue({
      fullName: null,
      emailAddresses: [],
    } as never);

    const session = await getSession();

    expect(session).toBeNull();
    expect(mockUserUpsert).not.toHaveBeenCalled();
  });
});
