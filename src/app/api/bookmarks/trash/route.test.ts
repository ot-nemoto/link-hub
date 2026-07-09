// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET } from "./route";

vi.mock("@/lib/api-auth", () => ({ getUserByApiKey: vi.fn() }));
vi.mock("@/lib/bookmarks", () => ({
  getDeletedBookmarks: vi.fn(),
  emptyTrash: vi.fn(),
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { getUserByApiKey } from "@/lib/api-auth";
import { emptyTrash, getDeletedBookmarks } from "@/lib/bookmarks";

const mockGetUser = vi.mocked(getUserByApiKey);
const mockGetDeleted = vi.mocked(getDeletedBookmarks);
const mockEmptyTrash = vi.mocked(emptyTrash);

const record = {
  id: "bm_1",
  url: "https://a.com",
  title: "A",
  memo: null,
  ogImage: null,
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  tag: null,
};

describe("GET /api/bookmarks/trash", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await GET({} as never);

    expect(res.status).toBe(401);
    expect(mockGetDeleted).not.toHaveBeenCalled();
  });

  it("正常系: 削除済みブックマークを共通形式で返す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockGetDeleted.mockResolvedValue([record] as never);

    const res = await GET({} as never);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      bookmarks: [
        {
          id: "bm_1",
          url: "https://a.com",
          title: "A",
          memo: null,
          ogImage: null,
          category: null,
          createdAt: "2026-01-02T03:04:05.000Z",
        },
      ],
    });
    expect(mockGetDeleted).toHaveBeenCalledWith("user_1");
  });
});

describe("DELETE /api/bookmarks/trash", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await DELETE({} as never);

    expect(res.status).toBe(401);
    expect(mockEmptyTrash).not.toHaveBeenCalled();
  });

  it("正常系: 204 でゴミ箱を空にする", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockEmptyTrash.mockResolvedValue({});

    const res = await DELETE({} as never);

    expect(res.status).toBe(204);
    expect(mockEmptyTrash).toHaveBeenCalledWith("user_1");
  });
});
