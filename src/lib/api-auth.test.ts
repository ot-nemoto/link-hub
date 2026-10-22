// @vitest-environment node
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserByApiKey } from "./api-auth";
import { hashApiKey } from "./api-key";
import { buildAuditRecord } from "./audit-log";

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
    it("lastUsedAt の更新が失敗しても認証結果を返す", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "user_1", apiKeyLastUsedAt: null } as never);
      mockUserUpdate.mockRejectedValue(new Error("connection error"));

      expect(await getUserByApiKey(reqWith("Bearer lh_abc"))).toEqual({ id: "user_1" });
      expect(mockUserUpdate).toHaveBeenCalledTimes(1);
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

    it("一致するユーザーが無い場合は null（lastUsedAt も更新しない）", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      expect(await getUserByApiKey(reqWith("Bearer lh_unknown"))).toBeNull();
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });
  });
});

// 監査ログのラッパーは認証ユーザーを知らないため、getUserByApiKey が
// Request インスタンスをキーに受け渡す。その経路を固定する。
describe("監査ログへの userId 受け渡し", () => {
  it("正常系: 認証が通ったユーザーが監査レコードに載る", async () => {
    // @ts-expect-error モックのため一部フィールドのみ
    mockUserFindUnique.mockResolvedValue({ id: "user-uuid", apiKeyLastUsedAt: new Date() });
    const req = new Request("https://example.com/api/bookmarks", {
      headers: { authorization: "Bearer valid-key" },
    });

    await getUserByApiKey(req as unknown as NextRequest);

    expect(buildAuditRecord(req, 200).userId).toBe("user-uuid");
  });

  it("異常系: キーが一致しなければ userId は null のまま", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const req = new Request("https://example.com/api/bookmarks", {
      headers: { authorization: "Bearer invalid-key" },
    });

    await getUserByApiKey(req as unknown as NextRequest);

    expect(buildAuditRecord(req, 401).userId).toBeNull();
  });
});
