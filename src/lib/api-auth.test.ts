// @vitest-environment node
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserByApiKey } from "./api-auth";
import { hashApiKey } from "./api-key";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { prisma } from "@/lib/prisma";

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserUpdate = vi.mocked(prisma.user.update);

const NOW = new Date("2026-10-11T12:00:00Z");
const HOUR_MS = 60 * 60 * 1000;

function reqWith(authorization?: string): NextRequest {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? (authorization ?? null) : null,
    },
  } as unknown as NextRequest;
}

describe("getUserByApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => vi.useRealTimers());

  describe("正常系", () => {
    it("Bearer キーのハッシュで検索し、一致するユーザーを返す", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "user_1",
        apiKeyLastUsedAt: new Date(NOW.getTime() - 1000),
      } as never);

      const user = await getUserByApiKey(reqWith("Bearer lh_abc"));

      expect(user).toEqual({ id: "user_1" });
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { apiKeyHash: await hashApiKey("lh_abc") },
        select: { id: true, apiKeyLastUsedAt: true },
      });
    });

    it("未使用（lastUsedAt が null）なら lastUsedAt を更新する", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user_1", apiKeyLastUsedAt: null } as never);

      await getUserByApiKey(reqWith("Bearer lh_abc"));

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { apiKeyLastUsedAt: NOW },
      });
    });

    it("前回更新から 1 時間以上経過していれば lastUsedAt を更新する", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "user_1",
        apiKeyLastUsedAt: new Date(NOW.getTime() - HOUR_MS),
      } as never);

      await getUserByApiKey(reqWith("Bearer lh_abc"));

      expect(mockUserUpdate).toHaveBeenCalledTimes(1);
    });

    it("前回更新から 1 時間未満なら lastUsedAt を更新しない", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "user_1",
        apiKeyLastUsedAt: new Date(NOW.getTime() - HOUR_MS + 1),
      } as never);

      await getUserByApiKey(reqWith("Bearer lh_abc"));

      expect(mockUserUpdate).not.toHaveBeenCalled();
    });
  });

  describe("異常系", () => {
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

    it("一致するユーザーが無い場合は null（lastUsedAt も更新しない）", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      expect(await getUserByApiKey(reqWith("Bearer lh_unknown"))).toBeNull();
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });
  });
});
