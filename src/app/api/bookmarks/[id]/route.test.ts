// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "./route";

vi.mock("@/lib/api-auth", () => ({ getUserByApiKey: vi.fn() }));
vi.mock("@/lib/bookmarks", () => ({
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { getUserByApiKey } from "@/lib/api-auth";
import { deleteBookmark, updateBookmark } from "@/lib/bookmarks";

const mockGetUser = vi.mocked(getUserByApiKey);
const mockUpdate = vi.mocked(updateBookmark);
const mockDelete = vi.mocked(deleteBookmark);

const record = {
  id: "bm_1",
  url: "https://a.com",
  title: "Updated",
  memo: null,
  ogImage: null,
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  tag: null,
};

function patchReq(body: unknown) {
  return { json: async () => body } as never;
}

const ctx = { params: Promise.resolve({ id: "bm_1" }) };

describe("PATCH /api/bookmarks/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await PATCH(patchReq({ url: "https://a.com", title: "A" }), ctx);

    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("バリデーション失敗（url 無し）は 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await PATCH(patchReq({ title: "A" }), ctx);

    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("body が非オブジェクト（配列）の場合は 400（日本語メッセージ）", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await PATCH(patchReq([1, 2, 3]), ctx);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "リクエストボディが不正です" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("存在しない場合は 404", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockUpdate.mockResolvedValue({ error: "ブックマークが見つかりません" });

    const res = await PATCH(patchReq({ url: "https://a.com", title: "A" }), ctx);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "ブックマークが見つかりません" });
  });

  it("他ユーザーのリソースは 403", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockUpdate.mockResolvedValue({ error: "権限がありません" });

    const res = await PATCH(patchReq({ url: "https://a.com", title: "A" }), ctx);

    expect(res.status).toBe(403);
  });

  it("正常系: 200 で更新リソースを返し lib を呼ぶ", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockUpdate.mockResolvedValue({ bookmark: record as never });

    const res = await PATCH(patchReq({ url: "https://a.com", title: "Updated" }), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "bm_1",
      url: "https://a.com",
      title: "Updated",
      memo: null,
      ogImage: null,
      category: null,
      createdAt: "2026-01-02T03:04:05.000Z",
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      "user_1",
      "bm_1",
      expect.objectContaining({ url: "https://a.com", title: "Updated" }),
    );
  });

  it("tagId + sortOrder を同時指定すると lib に渡す（moveBookmark 相当）", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockUpdate.mockResolvedValue({ bookmark: record as never });

    const res = await PATCH(
      patchReq({ url: "https://a.com", title: "A", tagId: "t9", sortOrder: 3 }),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      "user_1",
      "bm_1",
      expect.objectContaining({ tagId: "t9", sortOrder: 3 }),
    );
  });

  it("sortOrder が整数以外の場合は 400（lib に到達させない）", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await PATCH(patchReq({ url: "https://a.com", title: "A", sortOrder: 1.5 }), ctx);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "sortOrder は 0 以上 2147483647 以下の整数で指定してください",
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/bookmarks/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await DELETE({} as never, ctx);

    expect(res.status).toBe(401);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("存在しない場合は 404", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockDelete.mockResolvedValue({ error: "ブックマークが見つかりません" });

    const res = await DELETE({} as never, ctx);

    expect(res.status).toBe(404);
  });

  it("他ユーザーのリソースは 403", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockDelete.mockResolvedValue({ error: "権限がありません" });

    const res = await DELETE({} as never, ctx);

    expect(res.status).toBe(403);
  });

  it("正常系: 204 で削除し lib を呼ぶ", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockDelete.mockResolvedValue({});

    const res = await DELETE({} as never, ctx);

    expect(res.status).toBe(204);
    expect(mockDelete).toHaveBeenCalledWith("user_1", "bm_1");
  });
});
