// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "./route";

vi.mock("@/lib/api-auth", () => ({ getUserByApiKey: vi.fn() }));
vi.mock("@/lib/tags", () => ({
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { getUserByApiKey } from "@/lib/api-auth";
import { deleteTag, updateTag } from "@/lib/tags";

const mockGetUser = vi.mocked(getUserByApiKey);
const mockUpdate = vi.mocked(updateTag);
const mockDelete = vi.mocked(deleteTag);

function jsonReq(body: unknown) {
  return { json: async () => body } as never;
}

const ctx = { params: Promise.resolve({ id: "t1" }) };

describe("PATCH /api/tags/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await PATCH(jsonReq({ name: "Vue" }), ctx);

    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("name が非文字列の場合は 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await PATCH(jsonReq({ name: 123 }), ctx);

    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("同名タグは 409", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockUpdate.mockResolvedValue({ conflict: true, tag: { id: "t2", name: "Vue" } });

    const res = await PATCH(jsonReq({ name: "Vue" }), ctx);

    expect(res.status).toBe(409);
  });

  it("存在しない場合は 404", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockUpdate.mockResolvedValue({ error: "タグが見つかりません" });

    const res = await PATCH(jsonReq({ name: "Vue" }), ctx);

    expect(res.status).toBe(404);
  });

  it("他ユーザーのタグは 403", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockUpdate.mockResolvedValue({ error: "権限がありません" });

    const res = await PATCH(jsonReq({ name: "Vue" }), ctx);

    expect(res.status).toBe(403);
  });

  it("正常系: 200 で更新タグを返す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockUpdate.mockResolvedValue({ tag: { id: "t1", name: "Vue" } });

    const res = await PATCH(jsonReq({ name: "Vue" }), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "t1", name: "Vue" });
    expect(mockUpdate).toHaveBeenCalledWith("user_1", "t1", "Vue");
  });
});

describe("DELETE /api/tags/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await DELETE({} as never, ctx);

    expect(res.status).toBe(401);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("存在しない場合は 404", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockDelete.mockResolvedValue({ error: "タグが見つかりません" });

    const res = await DELETE({} as never, ctx);

    expect(res.status).toBe(404);
  });

  it("他ユーザーのタグは 403", async () => {
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
    expect(mockDelete).toHaveBeenCalledWith("user_1", "t1");
  });
});
