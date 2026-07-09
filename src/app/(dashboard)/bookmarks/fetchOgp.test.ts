// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/ogp", () => ({ fetchOgpData: vi.fn() }));

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { fetchOgpData } from "@/lib/ogp";
import { fetchOgp } from "./fetchOgp";

const mockGetSession = vi.mocked(getSession);
const mockFetchOgpData = vi.mocked(fetchOgpData);
const mockRedirect = vi.mocked(redirect).mockImplementation(() => {
  throw new Error("NEXT_REDIRECT");
});
const session = { user: { id: "user_1", name: "Test", email: "test@example.com" } };

describe("fetchOgp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証の場合は /sign-in にリダイレクトし lib を呼ばない", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(fetchOgp("https://example.com")).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
    expect(mockFetchOgpData).not.toHaveBeenCalled();
  });

  it("認証済みの場合は fetchOgpData に委譲して結果を返す", async () => {
    mockGetSession.mockResolvedValue(session);
    mockFetchOgpData.mockResolvedValue({ title: "T", image: "https://example.com/og.png" });

    const result = await fetchOgp("https://example.com");

    expect(result).toEqual({ title: "T", image: "https://example.com/og.png" });
    expect(mockFetchOgpData).toHaveBeenCalledWith("https://example.com");
  });
});
