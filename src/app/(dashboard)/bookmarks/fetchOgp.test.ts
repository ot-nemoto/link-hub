// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchOgp } from "./fetchOgp";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const makeHtmlResponse = (html: string) =>
  new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });

const makeBytesResponse = (bytes: Uint8Array, contentType: string) =>
  new Response(bytes, { status: 200, headers: { "Content-Type": contentType } });

// "日本語" を各エンコーディングで表したバイト列（ASCII 部分は latin1 でそのまま）
const ascii = (str: string) => Array.from(str, (c) => c.charCodeAt(0));
const buildBytes = (before: string, jaBytes: number[], after: string) =>
  new Uint8Array([...ascii(before), ...jaBytes, ...ascii(after)]);

const EUC_JP_NIHONGO = [0xc6, 0xfc, 0xcb, 0xdc, 0xb8, 0xec];
const SHIFT_JIS_NIHONGO = [0x93, 0xfa, 0x96, 0x7b, 0x8c, 0xea];

describe("fetchOgp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("og:title と og:image を取得できる（property が content より前）", async () => {
    mockFetch.mockResolvedValue(
      makeHtmlResponse(`
        <html>
          <head>
            <meta property="og:title" content="OG Title" />
            <meta property="og:image" content="https://example.com/og.png" />
          </head>
        </html>
      `),
    );

    const result = await fetchOgp("https://example.com");

    expect(result).toEqual({ title: "OG Title", image: "https://example.com/og.png" });
  });

  it("og:title と og:image を取得できる（content が property より前）", async () => {
    mockFetch.mockResolvedValue(
      makeHtmlResponse(`
        <html>
          <head>
            <meta content="OG Title Reversed" property="og:title" />
            <meta content="https://example.com/og-rev.png" property="og:image" />
          </head>
        </html>
      `),
    );

    const result = await fetchOgp("https://example.com");

    expect(result).toEqual({
      title: "OG Title Reversed",
      image: "https://example.com/og-rev.png",
    });
  });

  it("タイトルの HTMLエンティティをデコードする", async () => {
    mockFetch.mockResolvedValue(
      makeHtmlResponse(
        '<html><head><meta property="og:title" content="リリースノート &nbsp;|&nbsp; Gemini API" /></head></html>',
      ),
    );

    const result = await fetchOgp("https://example.com");

    expect(result.title).toBe("リリースノート  |  Gemini API");
  });

  it("<title> タグの HTMLエンティティもデコードする", async () => {
    mockFetch.mockResolvedValue(
      makeHtmlResponse(`
        <html>
          <head>
            <title>A &amp; B &lt;test&gt;</title>
          </head>
        </html>
      `),
    );

    const result = await fetchOgp("https://example.com");

    expect(result.title).toBe("A & B <test>");
  });

  it("og:title がない場合 <title> タグからフォールバック取得する", async () => {
    mockFetch.mockResolvedValue(
      makeHtmlResponse(`
        <html>
          <head>
            <title>  Page Title  </title>
          </head>
        </html>
      `),
    );

    const result = await fetchOgp("https://example.com");

    expect(result.title).toBe("Page Title");
  });

  it("相対パスの og:image を絶対 URL に解決する（ルート相対）", async () => {
    mockFetch.mockResolvedValue(
      makeHtmlResponse(`
        <html>
          <head>
            <meta property="og:image" content="/images/og.png" />
          </head>
        </html>
      `),
    );

    const result = await fetchOgp("https://example.com/page");

    expect(result.image).toBe("https://example.com/images/og.png");
  });

  it("相対パスの og:image を絶対 URL に解決する（ページ相対）", async () => {
    mockFetch.mockResolvedValue(
      makeHtmlResponse(`
        <html>
          <head>
            <meta property="og:image" content="img.png" />
          </head>
        </html>
      `),
    );

    const result = await fetchOgp("https://example.com/blog/post");

    expect(result.image).toBe("https://example.com/blog/img.png");
  });

  it("fetch が !res.ok の場合 error を返す", async () => {
    mockFetch.mockResolvedValue(new Response("Not Found", { status: 404 }));

    const result = await fetchOgp("https://example.com");

    expect(result).toEqual({ error: "取得できませんでした" });
  });

  it("fetch が例外を投げた場合 error を返す", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));

    const result = await fetchOgp("https://example.com");

    expect(result).toEqual({ error: "取得できませんでした" });
  });

  it("AbortSignal タイムアウト（DOMException）でも error を返す", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    mockFetch.mockRejectedValue(abortError);

    const result = await fetchOgp("https://example.com");

    expect(result).toEqual({ error: "取得できませんでした" });
  });

  it("http/https 以外のプロトコルは error を返す（SSRF対策）", async () => {
    const result = await fetchOgp("file:///etc/passwd");
    expect(result).toEqual({ error: "取得できませんでした" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("localhost は error を返す（SSRF対策）", async () => {
    const result = await fetchOgp("http://localhost/admin");
    expect(result).toEqual({ error: "取得できませんでした" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("og:image がない場合 image は undefined で返す", async () => {
    mockFetch.mockResolvedValue(
      makeHtmlResponse(`
        <html>
          <head>
            <meta property="og:title" content="Title Only" />
          </head>
        </html>
      `),
    );

    const result = await fetchOgp("https://example.com");

    expect(result).toEqual({ title: "Title Only", image: undefined });
  });

  it("og:title も <title> タグもない場合 title は undefined で返す", async () => {
    mockFetch.mockResolvedValue(makeHtmlResponse(`<html><head></head><body></body></html>`));

    const result = await fetchOgp("https://example.com");

    expect(result).toEqual({ title: undefined, image: undefined });
  });

  it("Content-Type ヘッダーの charset で EUC-JP のタイトルを decode する", async () => {
    const bytes = buildBytes(
      '<html><head><meta property="og:title" content="',
      EUC_JP_NIHONGO,
      '" /></head></html>',
    );
    mockFetch.mockResolvedValue(makeBytesResponse(bytes, "text/html; charset=EUC-JP"));

    const result = await fetchOgp("https://example.com");

    expect(result.title).toBe("日本語");
  });

  it("Content-Type ヘッダーの charset で Shift_JIS のタイトルを decode する", async () => {
    const bytes = buildBytes(
      '<html><head><meta property="og:title" content="',
      SHIFT_JIS_NIHONGO,
      '" /></head></html>',
    );
    mockFetch.mockResolvedValue(makeBytesResponse(bytes, "text/html; charset=Shift_JIS"));

    const result = await fetchOgp("https://example.com");

    expect(result.title).toBe("日本語");
  });

  it("<meta charset> で EUC-JP のタイトルを decode する（ヘッダーに charset なし）", async () => {
    const bytes = buildBytes(
      '<html><head><meta charset="euc-jp"><meta property="og:title" content="',
      EUC_JP_NIHONGO,
      '" /></head></html>',
    );
    mockFetch.mockResolvedValue(makeBytesResponse(bytes, "text/html"));

    const result = await fetchOgp("https://example.com");

    expect(result.title).toBe("日本語");
  });

  it("<meta http-equiv=Content-Type> で Shift_JIS のタイトルを decode する", async () => {
    const bytes = buildBytes(
      '<html><head><meta http-equiv="Content-Type" content="text/html; charset=Shift_JIS"><meta property="og:title" content="',
      SHIFT_JIS_NIHONGO,
      '" /></head></html>',
    );
    mockFetch.mockResolvedValue(makeBytesResponse(bytes, "text/html"));

    const result = await fetchOgp("https://example.com");

    expect(result.title).toBe("日本語");
  });

  it("charset が判定できない場合は UTF-8 として decode する", async () => {
    const bytes = new Uint8Array(
      new TextEncoder().encode(
        '<html><head><meta property="og:title" content="日本語タイトル" /></head></html>',
      ),
    );
    mockFetch.mockResolvedValue(makeBytesResponse(bytes, "text/html"));

    const result = await fetchOgp("https://example.com");

    expect(result.title).toBe("日本語タイトル");
  });

  it("プライベートIPは error を返す（SSRF対策）", async () => {
    for (const url of [
      "http://10.0.0.1/secret",
      "http://172.16.0.1/secret",
      "http://192.168.1.1/secret",
      "http://169.254.169.254/latest/meta-data",
    ]) {
      const result = await fetchOgp(url);
      expect(result).toEqual({ error: "取得できませんでした" });
      expect(mockFetch).not.toHaveBeenCalled();
    }
  });
});
