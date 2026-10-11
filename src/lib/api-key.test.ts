// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApiKeyValue, generateApiKey, hasApiKey, hashApiKey, revokeApiKey } from "./api-key";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { prisma } from "@/lib/prisma";

const mockUserUpdate = vi.mocked(prisma.user.update);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);

const userId = "user_1";

// `lh_` + base64url(32 bytes)（パディング無し 43 文字）
const API_KEY_RE = /^lh_[A-Za-z0-9_-]{43}$/;

describe("createApiKeyValue", () => {
  it("lh_ prefix 付きの base64url 形式のキーを生成する", () => {
    expect(createApiKeyValue()).toMatch(API_KEY_RE);
  });

  it("呼び出しごとに異なる値を返す", () => {
    expect(createApiKeyValue()).not.toBe(createApiKeyValue());
  });
});

describe("hashApiKey", () => {
  it("SHA-256 の hex を返す（既知ベクタ）", async () => {
    expect(await hashApiKey("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("マルチバイト文字は UTF-8 バイト列としてハッシュ化する", async () => {
    // PostgreSQL: encode(sha256(convert_to('あ', 'UTF8')), 'hex') と一致する値
    expect(await hashApiKey("あ")).toBe(
      "dc5a4d3d82f7e15792959dc661538ae0e541ce66494516f5c9cfd9cd3308494d",
    );
  });

  it("空文字でもハッシュを返す", async () => {
    expect(await hashApiKey("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

describe("generateApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("生値を返し、DB にはハッシュと prefix のみ保存する", async () => {
    mockUserUpdate.mockResolvedValue({} as never);

    const key = await generateApiKey(userId);

    expect(key).toMatch(API_KEY_RE);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        apiKeyHash: await hashApiKey(key),
        apiKeyPrefix: key.slice(0, 8),
        apiKeyCreatedAt: expect.any(Date),
        apiKeyLastUsedAt: null,
      },
    });
  });
});

describe("hasApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("発行済みなら true を返す", async () => {
    mockUserFindUnique.mockResolvedValue({ apiKeyHash: "hash" } as never);

    expect(await hasApiKey(userId)).toBe(true);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { apiKeyHash: true },
    });
  });

  it("未発行なら false を返す", async () => {
    mockUserFindUnique.mockResolvedValue({ apiKeyHash: null } as never);

    expect(await hasApiKey(userId)).toBe(false);
  });

  it("ユーザーが存在しなければ false を返す", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    expect(await hasApiKey(userId)).toBe(false);
  });
});

describe("revokeApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("キー関連のカラムをすべて null に更新する", async () => {
    mockUserUpdate.mockResolvedValue({} as never);

    await revokeApiKey(userId);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        apiKeyHash: null,
        apiKeyPrefix: null,
        apiKeyCreatedAt: null,
        apiKeyLastUsedAt: null,
      },
    });
  });
});
