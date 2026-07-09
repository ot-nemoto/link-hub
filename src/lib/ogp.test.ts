// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchOgpData } from "./ogp";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const makeHtmlResponse = (html: string) =>
  new Response(html, { status: 200, headers: { "Content-Type": "text/html" } });

const makeBytesResponse = (bytes: Uint8Array, contentType: string) =>
  // Uint8Array は実行時に BodyInit として有効。TS 6 の TypedArray ジェネリック化で型が合わないため cast する
  new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: { "Content-Type": contentType },
  });

// "日本語" を各エンコーディングで表したバイト列（ASCII 部分は latin1 でそのまま）
const ascii = (str: string) => Array.from(str, (c) => c.charCodeAt(0));
const buildBytes = (before: string, jaBytes: number[], after: string) =>
  new Uint8Array([...ascii(before), ...jaBytes, ...ascii(after)]);

const EUC_JP_NIHONGO = [0xc6, 0xfc, 0xcb, 0xdc, 0xb8, 0xec];
const SHIFT_JIS_NIHONGO = [0x93, 0xfa, 0x96, 0x7b, 0x8c, 0xea];

describe("fetchOgpData", () => {
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

    const result = await fetchOgpData("https://example.com");

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

    const result = await fetchOgpData("https://example.com");

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

    const result = await fetchOgpData("https://example.com");

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

    const result = await fetchOgpData("https://example.com");

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

    const result = await fetchOgpData("https://example.com");

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

    const result = await fetchOgpData("https://example.com/page");

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

    const result = await fetchOgpData("https://example.com/blog/post");

    expect(result.image).toBe("https://example.com/blog/img.png");
  });

  it("fetch が !res.ok の場合 error を返す", async () => {
    mockFetch.mockResolvedValue(new Response("Not Found", { status: 404 }));

    const result = await fetchOgpData("https://example.com");

    expect(result).toEqual({ error: "取得できませんでした" });
  });

  it("fetch が例外を投げた場合 error を返す", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));

    const result = await fetchOgpData("https://example.com");

    expect(result).toEqual({ error: "取得できませんでした" });
  });

  it("AbortSignal タイムアウト（DOMException）でも error を返す", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    mockFetch.mockRejectedValue(abortError);

    const result = await fetchOgpData("https://example.com");

    expect(result).toEqual({ error: "取得できませんでした" });
  });

  it("http/https 以外のプロトコルは error を返す（SSRF対策）", async () => {
    const result = await fetchOgpData("file:///etc/passwd");
    expect(result).toEqual({ error: "取得できませんでした" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("localhost は error を返す（SSRF対策）", async () => {
    const result = await fetchOgpData("http://localhost/admin");
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

    const result = await fetchOgpData("https://example.com");

    expect(result).toEqual({ title: "Title Only", image: undefined });
  });

  it("og:title も <title> タグもない場合 title は undefined で返す", async () => {
    mockFetch.mockResolvedValue(makeHtmlResponse(`<html><head></head><body></body></html>`));

    const result = await fetchOgpData("https://example.com");

    expect(result).toEqual({ title: undefined, image: undefined });
  });

  it("Content-Type ヘッダーの charset で EUC-JP のタイトルを decode する", async () => {
    const bytes = buildBytes(
      '<html><head><meta property="og:title" content="',
      EUC_JP_NIHONGO,
      '" /></head></html>',
    );
    mockFetch.mockResolvedValue(makeBytesResponse(bytes, "text/html; charset=EUC-JP"));

    const result = await fetchOgpData("https://example.com");

    expect(result.title).toBe("日本語");
  });

  it("Content-Type ヘッダーの charset で Shift_JIS のタイトルを decode する", async () => {
    const bytes = buildBytes(
      '<html><head><meta property="og:title" content="',
      SHIFT_JIS_NIHONGO,
      '" /></head></html>',
    );
    mockFetch.mockResolvedValue(makeBytesResponse(bytes, "text/html; charset=Shift_JIS"));

    const result = await fetchOgpData("https://example.com");

    expect(result.title).toBe("日本語");
  });

  it("<meta charset> で EUC-JP のタイトルを decode する（ヘッダーに charset なし）", async () => {
    const bytes = buildBytes(
      '<html><head><meta charset="euc-jp"><meta property="og:title" content="',
      EUC_JP_NIHONGO,
      '" /></head></html>',
    );
    mockFetch.mockResolvedValue(makeBytesResponse(bytes, "text/html"));

    const result = await fetchOgpData("https://example.com");

    expect(result.title).toBe("日本語");
  });

  it("<meta http-equiv=Content-Type> で Shift_JIS のタイトルを decode する", async () => {
    const bytes = buildBytes(
      '<html><head><meta http-equiv="Content-Type" content="text/html; charset=Shift_JIS"><meta property="og:title" content="',
      SHIFT_JIS_NIHONGO,
      '" /></head></html>',
    );
    mockFetch.mockResolvedValue(makeBytesResponse(bytes, "text/html"));

    const result = await fetchOgpData("https://example.com");

    expect(result.title).toBe("日本語");
  });

  it("charset が判定できない場合は UTF-8 として decode する", async () => {
    const bytes = new Uint8Array(
      new TextEncoder().encode(
        '<html><head><meta property="og:title" content="日本語タイトル" /></head></html>',
      ),
    );
    mockFetch.mockResolvedValue(makeBytesResponse(bytes, "text/html"));

    const result = await fetchOgpData("https://example.com");

    expect(result.title).toBe("日本語タイトル");
  });

  it("プライベートIPは error を返す（SSRF対策）", async () => {
    for (const url of [
      "http://10.0.0.1/secret",
      "http://172.16.0.1/secret",
      "http://192.168.1.1/secret",
      "http://169.254.169.254/latest/meta-data",
    ]) {
      const result = await fetchOgpData(url);
      expect(result).toEqual({ error: "取得できませんでした" });
      expect(mockFetch).not.toHaveBeenCalled();
    }
  });

  it("IPv6 系・0.0.0.0 など SSRF バイパスを遮断する", async () => {
    for (const url of [
      "http://0/", // 0.0.0.0 に正規化
      "http://0.0.0.0/",
      "http://[::1]/", // IPv6 ループバック
      "http://[::ffff:127.0.0.1]/", // IPv4-mapped ループバック
      "http://[::ffff:169.254.169.254]/", // IPv4-mapped メタデータIP
      "http://[fc00::1]/", // ULA
      "http://[fd12:3456::1]/", // ULA
      "http://[fe80::1]/", // リンクローカル
    ]) {
      const result = await fetchOgpData(url);
      expect(result, `${url} should be blocked`).toEqual({ error: "取得できませんでした" });
      expect(mockFetch, `${url} should not fetch`).not.toHaveBeenCalled();
    }
  });

  it("10進数/16進数表記の IPv4 も new URL 正規化で遮断される", async () => {
    for (const url of ["http://2130706433/", "http://0x7f000001/"]) {
      const result = await fetchOgpData(url);
      expect(result, `${url} should be blocked`).toEqual({ error: "取得できませんでした" });
      expect(mockFetch).not.toHaveBeenCalled();
    }
  });

  it("グローバル IPv6 は許可して fetch する", async () => {
    mockFetch.mockResolvedValue(makeHtmlResponse("<html><head><title>OK</title></head></html>"));

    const result = await fetchOgpData("http://[2606:2800:220:1:248:1893:25c8:1946]/");

    expect(result.title).toBe("OK");
    expect(mockFetch).toHaveBeenCalled();
  });
});
