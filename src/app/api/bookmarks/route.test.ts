// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

vi.mock("@/lib/api-auth", () => ({ getUserByApiKey: vi.fn() }));
vi.mock("@/lib/bookmarks", () => ({ getBookmarks: vi.fn() }));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { getUserByApiKey } from "@/lib/api-auth";
import { getBookmarks } from "@/lib/bookmarks";

const mockGetUser = vi.mocked(getUserByApiKey);
const mockGetBookmarks = vi.mocked(getBookmarks);

describe("GET /api/bookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証（キー不一致）の場合は 401 を返す", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await GET({} as never);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockGetBookmarks).not.toHaveBeenCalled();
  });

  it("認証成功時は未削除ブックマークを JSON で返す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    mockGetBookmarks.mockResolvedValue([
      {
        id: "bm_1",
        url: "https://a.com",
        title: "A",
        memo: "memo",
        ogImage: "img",
        createdAt,
        tag: { id: "t1", name: "Cat" },
      },
    ] as never);

    const res = await GET({} as never);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      bookmarks: [
        {
          id: "bm_1",
          url: "https://a.com",
          title: "A",
          memo: "memo",
          ogImage: "img",
          category: { id: "t1", name: "Cat" },
          createdAt: createdAt.toISOString(),
        },
      ],
    });
    expect(mockGetBookmarks).toHaveBeenCalledWith("user_1");
  });

  it("カテゴリ未設定は category: null で返す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockGetBookmarks.mockResolvedValue([
      {
        id: "bm_2",
        url: "https://b.com",
        title: "B",
        memo: null,
        ogImage: null,
        createdAt: new Date(),
        tag: null,
      },
    ] as never);

    const res = await GET({} as never);
    const json = await res.json();

    expect(json.bookmarks[0].category).toBeNull();
  });
});
