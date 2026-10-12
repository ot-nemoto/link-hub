// @vitest-environment node
import { notFound, redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  jsonError,
  serializeBookmark,
  statusForError,
  unauthorized,
  withApiErrorHandling,
} from "./api-response";

const base = {
  id: "bm_1",
  url: "https://example.com",
  title: "Example",
  memo: "メモ",
  ogImage: "https://example.com/og.png",
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
};

describe("serializeBookmark", () => {
  it("正常系: createdAt を ISO 文字列で返す", () => {
    const result = serializeBookmark({ ...base, tag: { id: "t1", name: "Cat" } });

    expect(result).toEqual({
      id: "bm_1",
      url: "https://example.com",
      title: "Example",
      memo: "メモ",
      ogImage: "https://example.com/og.png",
      tag: { id: "t1", name: "Cat" },
      createdAt: "2026-01-02T03:04:05.000Z",
    });
  });

  it("tag が null の場合は tag: null", () => {
    const result = serializeBookmark({ ...base, memo: null, ogImage: null, tag: null });

    expect(result.tag).toBeNull();
    expect(result.memo).toBeNull();
    expect(result.ogImage).toBeNull();
  });
});

describe("statusForError", () => {
  it("「権限がありません」は 403", () => {
    expect(statusForError("権限がありません")).toBe(403);
  });

  it("「見つかりません」を含む場合は 404", () => {
    expect(statusForError("ブックマークが見つかりません")).toBe(404);
    expect(statusForError("タグが見つかりません")).toBe(404);
  });

  it("それ以外は 400", () => {
    expect(statusForError("タグ名が不正です")).toBe(400);
  });
});

describe("jsonError / unauthorized", () => {
  it("jsonError は指定 status と error ボディを返す", async () => {
    const res = jsonError("だめ", 400);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "だめ" });
  });

  it("unauthorized は 401 / Unauthorized", async () => {
    const res = unauthorized();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});

describe("withApiErrorHandling", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  it("正常系: ハンドラのレスポンスと引数をそのまま扱う", async () => {
    const handler = vi.fn(async (a: string, b: number) => Response.json({ a, b }, { status: 201 }));

    const res = await withApiErrorHandling(handler)("x", 1);

    expect(handler).toHaveBeenCalledWith("x", 1);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ a: "x", b: 1 });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("例外時は 500 { error } を返し、例外の内容はレスポンスに含めずログに残す", async () => {
    const error = new Error("connection to db-host:5432 failed");
    const res = await withApiErrorHandling(async () => {
      throw error;
    })();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal Server Error" });
    expect(JSON.stringify(body)).not.toContain("db-host");
    expect(consoleError).toHaveBeenCalledWith("[api] 500", error);
  });

  it("redirect() の制御フロー例外は 500 にせず再 throw する", async () => {
    const handler = withApiErrorHandling(async () => {
      redirect("/sign-in");
    });

    // unstable_rethrow が無いと 500 レスポンスに化ける
    await expect(handler()).rejects.toThrow("NEXT_REDIRECT");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("notFound() の制御フロー例外は 500 にせず再 throw する", async () => {
    const handler = withApiErrorHandling(async () => {
      notFound();
    });

    await expect(handler()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("引数が Request なら、ログにメソッドとパス（クエリは含めない）を付ける", async () => {
    const error = new Error("boom");
    const req = new Request("http://localhost:3000/api/tags?withCount=true", { method: "POST" });

    await withApiErrorHandling(async (_req: Request) => {
      throw error;
    })(req);

    expect(consoleError).toHaveBeenCalledWith("[api] 500 POST /api/tags", error);
  });
});
