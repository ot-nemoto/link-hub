// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApiKeyValue, generateApiKey, getApiKey, revokeApiKey } from "./api-key";

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("createApiKeyValue", () => {
  it("UUID 形式のキーを生成する", () => {
    expect(createApiKeyValue()).toMatch(UUID_RE);
  });

  it("呼び出しごとに異なる値を返す", () => {
    expect(createApiKeyValue()).not.toBe(createApiKeyValue());
  });
});

describe("generateApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("新しいキーを保存して返す", async () => {
    mockUserUpdate.mockResolvedValue({} as never);

    const key = await generateApiKey(userId);

    expect(key).toMatch(UUID_RE);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: userId },
      data: { apiKey: key },
    });
  });
});

describe("getApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("現在のキーを返す", async () => {
    mockUserFindUnique.mockResolvedValue({ apiKey: "lh_abc" } as never);

    const result = await getApiKey(userId);

    expect(result).toBe("lh_abc");
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { apiKey: true },
    });
  });

  it("未発行なら null を返す", async () => {
    mockUserFindUnique.mockResolvedValue({ apiKey: null } as never);

    expect(await getApiKey(userId)).toBeNull();
  });

  it("ユーザーが存在しなければ null を返す", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    expect(await getApiKey(userId)).toBeNull();
  });
});

describe("revokeApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("apiKey を null に更新する", async () => {
    mockUserUpdate.mockResolvedValue({} as never);

    await revokeApiKey(userId);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: userId },
      data: { apiKey: null },
    });
  });
});
