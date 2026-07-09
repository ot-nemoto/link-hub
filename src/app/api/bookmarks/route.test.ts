// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, POST } from "./route";

vi.mock("@/lib/api-auth", () => ({ getUserByApiKey: vi.fn() }));
vi.mock("@/lib/bookmarks", () => ({
  getBookmarks: vi.fn(),
  createBookmark: vi.fn(),
  deleteBookmarks: vi.fn(),
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { getUserByApiKey } from "@/lib/api-auth";
import { createBookmark, deleteBookmarks, getBookmarks } from "@/lib/bookmarks";

const mockGetUser = vi.mocked(getUserByApiKey);
const mockGetBookmarks = vi.mocked(getBookmarks);
const mockCreateBookmark = vi.mocked(createBookmark);
const mockDeleteBookmarks = vi.mocked(deleteBookmarks);

const record = {
  id: "bm_1",
  url: "https://a.com",
  title: "A",
  memo: "memo",
  ogImage: null,
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  tag: { id: "t1", name: "Cat" },
};

function jsonReq(body: unknown) {
  return { json: async () => body } as never;
}

function deleteReq(query: string) {
  return { nextUrl: { searchParams: new URLSearchParams(query) } } as never;
}

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
    mockGetBookmarks.mockResolvedValue([record] as never);

    const res = await GET({} as never);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      bookmarks: [
        {
          id: "bm_1",
          url: "https://a.com",
          title: "A",
          memo: "memo",
          ogImage: null,
          category: { id: "t1", name: "Cat" },
          createdAt: "2026-01-02T03:04:05.000Z",
        },
      ],
    });
    expect(mockGetBookmarks).toHaveBeenCalledWith("user_1");
  });
});

describe("POST /api/bookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await POST(jsonReq({ url: "https://a.com", title: "A" }));

    expect(res.status).toBe(401);
    expect(mockCreateBookmark).not.toHaveBeenCalled();
  });

  it("ボディが不正（非オブジェクト）な場合は 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await POST({ json: async () => null } as never);

    expect(res.status).toBe(400);
    expect(mockCreateBookmark).not.toHaveBeenCalled();
  });

  it("バリデーション失敗（title 無し）は 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await POST(jsonReq({ url: "https://a.com" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "title は必須です" });
    expect(mockCreateBookmark).not.toHaveBeenCalled();
  });

  it("tagId が非文字列の場合は 400（lib に到達させない）", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await POST(jsonReq({ url: "https://a.com", title: "A", tagId: 123 }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "tagId の形式が不正です" });
    expect(mockCreateBookmark).not.toHaveBeenCalled();
  });

  it("正常系: 201 で作成リソースを返し lib を呼ぶ", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockCreateBookmark.mockResolvedValue({ bookmark: record as never });

    const res = await POST(jsonReq({ url: "https://a.com", title: "A", memo: "memo" }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: "bm_1",
      url: "https://a.com",
      title: "A",
      memo: "memo",
      ogImage: null,
      category: { id: "t1", name: "Cat" },
      createdAt: "2026-01-02T03:04:05.000Z",
    });
    expect(mockCreateBookmark).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ url: "https://a.com", title: "A", memo: "memo" }),
    );
  });
});

describe("DELETE /api/bookmarks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await DELETE(deleteReq("ids=bm_1"));

    expect(res.status).toBe(401);
    expect(mockDeleteBookmarks).not.toHaveBeenCalled();
  });

  it("ids 未指定は 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await DELETE(deleteReq(""));

    expect(res.status).toBe(400);
    expect(mockDeleteBookmarks).not.toHaveBeenCalled();
  });

  it("正常系: 204 でソフトデリートし ids を渡す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockDeleteBookmarks.mockResolvedValue({});

    const res = await DELETE(deleteReq("ids=bm_1,bm_2"));

    expect(res.status).toBe(204);
    expect(mockDeleteBookmarks).toHaveBeenCalledWith("user_1", ["bm_1", "bm_2"]);
  });
});
