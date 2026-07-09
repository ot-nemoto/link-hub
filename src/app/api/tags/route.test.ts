// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

vi.mock("@/lib/api-auth", () => ({ getUserByApiKey: vi.fn() }));
vi.mock("@/lib/tags", () => ({
  getTags: vi.fn(),
  getTagsWithCount: vi.fn(),
  createTag: vi.fn(),
}));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { getUserByApiKey } from "@/lib/api-auth";
import { createTag, getTags, getTagsWithCount } from "@/lib/tags";

const mockGetUser = vi.mocked(getUserByApiKey);
const mockGetTags = vi.mocked(getTags);
const mockGetTagsWithCount = vi.mocked(getTagsWithCount);
const mockCreateTag = vi.mocked(createTag);

function jsonReq(body: unknown) {
  return { json: async () => body, nextUrl: { searchParams: new URLSearchParams() } } as never;
}

function getReq(query = "") {
  return { nextUrl: { searchParams: new URLSearchParams(query) } } as never;
}

describe("GET /api/tags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await GET(getReq());

    expect(res.status).toBe(401);
    expect(mockGetTags).not.toHaveBeenCalled();
  });

  it("正常系: カテゴリ一覧を返す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockGetTags.mockResolvedValue([{ id: "t1", name: "React" }] as never);

    const res = await GET(getReq());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tags: [{ id: "t1", name: "React" }] });
    expect(mockGetTags).toHaveBeenCalledWith("user_1");
    expect(mockGetTagsWithCount).not.toHaveBeenCalled();
  });

  it("?withCount=true で件数付き一覧を返す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockGetTagsWithCount.mockResolvedValue([
      { id: "t1", name: "React", bookmarkCount: 3 },
    ] as never);

    const res = await GET(getReq("withCount=true"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tags: [{ id: "t1", name: "React", bookmarkCount: 3 }] });
    expect(mockGetTagsWithCount).toHaveBeenCalledWith("user_1");
    expect(mockGetTags).not.toHaveBeenCalled();
  });
});

describe("POST /api/tags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await POST(jsonReq({ name: "React" }));

    expect(res.status).toBe(401);
    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it("name が非文字列の場合は 400（lib に到達させない）", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await POST(jsonReq({ name: 123 }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "name は必須です" });
    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it("同名カテゴリは 409", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockCreateTag.mockResolvedValue({ conflict: true, tag: { id: "t1", name: "React" } });

    const res = await POST(jsonReq({ name: "React" }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "同名のカテゴリが既に存在します" });
  });

  it("空/50字超など lib のバリデーションエラーは 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockCreateTag.mockResolvedValue({ error: "タグ名が不正です" });

    const res = await POST(jsonReq({ name: "" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "タグ名が不正です" });
  });

  it("正常系: 201 で作成カテゴリを返す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockCreateTag.mockResolvedValue({ tag: { id: "t1", name: "React" } });

    const res = await POST(jsonReq({ name: "React" }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "t1", name: "React" });
    expect(mockCreateTag).toHaveBeenCalledWith("user_1", "React");
  });
});
