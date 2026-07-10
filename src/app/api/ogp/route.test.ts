// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

vi.mock("@/lib/api-auth", () => ({ getUserByApiKey: vi.fn() }));
vi.mock("@/lib/ogp", () => ({ fetchOgpData: vi.fn() }));

vi.stubEnv("DATABASE_URL", "postgresql://test");

import { getUserByApiKey } from "@/lib/api-auth";
import { fetchOgpData } from "@/lib/ogp";

const mockGetUser = vi.mocked(getUserByApiKey);
const mockFetchOgpData = vi.mocked(fetchOgpData);

function req(query = "") {
  return { nextUrl: { searchParams: new URLSearchParams(query) } } as never;
}

describe("GET /api/ogp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は 401", async () => {
    mockGetUser.mockResolvedValue(null);

    const res = await GET(req("url=https://example.com"));

    expect(res.status).toBe(401);
    expect(mockFetchOgpData).not.toHaveBeenCalled();
  });

  it("url 未指定は 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await GET(req(""));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "url は必須です" });
    expect(mockFetchOgpData).not.toHaveBeenCalled();
  });

  it("url の形式が不正なら 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await GET(req("url=not-a-url"));

    expect(res.status).toBe(400);
    expect(mockFetchOgpData).not.toHaveBeenCalled();
  });

  it("http/https 以外は 400", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });

    const res = await GET(req("url=ftp://example.com"));

    expect(res.status).toBe(400);
    expect(mockFetchOgpData).not.toHaveBeenCalled();
  });

  it("正常系: 200 で title/image を返す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockFetchOgpData.mockResolvedValue({ title: "T", image: "https://example.com/og.png" });

    const res = await GET(req("url=https://example.com"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ title: "T", image: "https://example.com/og.png" });
    expect(mockFetchOgpData).toHaveBeenCalledWith("https://example.com");
  });

  it("取得失敗（error）の場合も 200 で空メタデータを返す", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockFetchOgpData.mockResolvedValue({ error: "取得できませんでした" });

    const res = await GET(req("url=https://example.com"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ title: null, image: null });
  });

  it("title/image が undefined の場合は null に正規化する", async () => {
    mockGetUser.mockResolvedValue({ id: "user_1" });
    mockFetchOgpData.mockResolvedValue({ title: "T" });

    const res = await GET(req("url=https://example.com"));

    expect(await res.json()).toEqual({ title: "T", image: null });
  });
});
