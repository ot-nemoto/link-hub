// @vitest-environment node
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getUserByApiKey } from "./api-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { prisma } from "@/lib/prisma";

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);

function reqWith(authorization?: string): NextRequest {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? (authorization ?? null) : null,
    },
  } as unknown as NextRequest;
}

describe("getUserByApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: Bearer キーに一致するユーザーを返す", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user_1" } as never);

    const user = await getUserByApiKey(reqWith("Bearer lh_abc"));

    expect(user).toEqual({ id: "user_1" });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { apiKey: "lh_abc" },
      select: { id: true },
    });
  });

  it("Authorization ヘッダーが無い場合は null", async () => {
    expect(await getUserByApiKey(reqWith(undefined))).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("Bearer スキームでない場合は null", async () => {
    expect(await getUserByApiKey(reqWith("Basic xxx"))).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("キーが空の場合は null", async () => {
    expect(await getUserByApiKey(reqWith("Bearer   "))).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("一致するユーザーが無い場合は null", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    expect(await getUserByApiKey(reqWith("Bearer lh_unknown"))).toBeNull();
  });
});
