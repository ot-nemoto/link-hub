// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("@/lib/api-auth", () => ({ getUserByApiKey: vi.fn() }));
vi.mock("@/lib/bookmarks", () => ({ restoreBookmark: vi.fn() }));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { getUserByApiKey } from "@/lib/api-auth";
import { restoreBookmark } from "@/lib/bookmarks";

const mockGetUser = vi.mocked(getUserByApiKey);
const mockRestore = vi.mocked(restoreBookmark);

const record = {
  id: "bm_1",
  url: "https://a.com",
  title: "A",
  memo: null,
  ogImage: null,
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  tag: { id: "t1", name: "Cat" },
};

const ctx = { params: Promise.resolve({ id: "bm_1" }) };

describe("POST /api/bookmarks/:id/restore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await POST({} as never, ctx);

    expect(res.status).toBe(401);
    expect(mockRestore).not.toHaveBeenCalled();
  });

  it("存在しない場合は 404", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockRestore.mockResolvedValue({ error: "ブックマークが見つかりません" });

    const res = await POST({} as never, ctx);

    expect(res.status).toBe(404);
  });

  it("他ユーザーのリソースは 403", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockRestore.mockResolvedValue({ error: "権限がありません" });

    const res = await POST({} as never, ctx);

    expect(res.status).toBe(403);
  });

  it("正常系: 200 で復元リソースを返し lib を呼ぶ", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockRestore.mockResolvedValue({ bookmark: record as never });

    const res = await POST({} as never, ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "bm_1",
      url: "https://a.com",
      title: "A",
      memo: null,
      ogImage: null,
      category: { id: "t1", name: "Cat" },
      createdAt: "2026-01-02T03:04:05.000Z",
    });
    expect(mockRestore).toHaveBeenCalledWith("user_1", "bm_1");
  });
});
