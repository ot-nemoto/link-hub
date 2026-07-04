// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateApiKey, revokeApiKey } from "./api-key-actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/api-key", () => ({
  generateApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as libApiKey from "@/lib/api-key";
import { getSession } from "@/lib/auth";

const mockRedirect = vi.mocked(redirect).mockImplementation(() => {
  throw new Error("NEXT_REDIRECT");
});
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockGetSession = vi.mocked(getSession);
const mockLibGenerate = vi.mocked(libApiKey.generateApiKey);
const mockLibRevoke = vi.mocked(libApiKey.revokeApiKey);

const session = { user: { id: "user_1", name: "Test", email: "test@example.com" } };

describe("generateApiKey action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: lib を呼び revalidatePath して生成したキーを返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibGenerate.mockResolvedValue("key-generated");

    const result = await generateApiKey();

    expect(mockLibGenerate).toHaveBeenCalledWith("user_1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({ apiKey: "key-generated" });
  });

  it("lib が失敗した場合は { error } を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibGenerate.mockRejectedValue(new Error("db error"));

    const result = await generateApiKey();

    expect(result).toEqual({ error: "API キーの生成に失敗しました" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(generateApiKey()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibGenerate).not.toHaveBeenCalled();
  });
});

describe("revokeApiKey action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: lib を呼び revalidatePath して {} を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibRevoke.mockResolvedValue(undefined);

    const result = await revokeApiKey();

    expect(mockLibRevoke).toHaveBeenCalledWith("user_1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/bookmarks");
    expect(result).toEqual({});
  });

  it("lib が失敗した場合は { error } を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockLibRevoke.mockRejectedValue(new Error("db error"));

    const result = await revokeApiKey();

    expect(result).toEqual({ error: "API キーの失効に失敗しました" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("未認証の場合 redirect を呼ぶ", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(revokeApiKey()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockLibRevoke).not.toHaveBeenCalled();
  });
});
