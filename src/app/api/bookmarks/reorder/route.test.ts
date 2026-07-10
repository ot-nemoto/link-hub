// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("@/lib/api-auth", () => ({ getUserByApiKey: vi.fn() }));
vi.mock("@/lib/bookmarks", () => ({ reorderBookmarks: vi.fn() }));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { getUserByApiKey } from "@/lib/api-auth";
import { reorderBookmarks } from "@/lib/bookmarks";

const mockGetUser = vi.mocked(getUserByApiKey);
const mockReorder = vi.mocked(reorderBookmarks);

function jsonReq(body: unknown) {
  return { json: async () => body } as never;
}

describe("POST /api/bookmarks/reorder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await POST(jsonReq({ ids: ["a", "b"] }));

    expect(res.status).toBe(401);
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it("ids が配列でない場合は 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await POST(jsonReq({ ids: "a,b" }));

    expect(res.status).toBe(400);
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it("body が非オブジェクト（配列・null）の場合は 400（日本語メッセージ）", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    for (const bad of [[1, 2, 3], null]) {
      const res = await POST(jsonReq(bad));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "リクエストボディが不正です" });
    }
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it("ids に非文字列が含まれる場合は 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await POST(jsonReq({ ids: ["a", 1] }));

    expect(res.status).toBe(400);
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it("ids が空配列の場合は 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await POST(jsonReq({ ids: [] }));

    expect(res.status).toBe(400);
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it("他ユーザーの id 混入は 403", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockReorder.mockResolvedValue({ error: "権限がありません" });

    const res = await POST(jsonReq({ ids: ["a", "b"] }));

    expect(res.status).toBe(403);
  });

  it("正常系: 200 で並び替えし ids を渡す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockReorder.mockResolvedValue({});

    const res = await POST(jsonReq({ ids: ["a", "b"] }));

    expect(res.status).toBe(200);
    expect(mockReorder).toHaveBeenCalledWith("user_1", ["a", "b"]);
  });
});
