import { describe, expect, it } from "vitest";
import { parseCollapsedCookie } from "./collapsed-cookie";

describe("parseCollapsedCookie", () => {
  it("encodeURIComponent された JSON をパースする", () => {
    const raw = encodeURIComponent(JSON.stringify({ a: true, b: false }));
    expect(parseCollapsedCookie(raw)).toEqual({ a: true, b: false });
  });

  it("未定義・空文字は空オブジェクトを返す", () => {
    expect(parseCollapsedCookie(undefined)).toEqual({});
    expect(parseCollapsedCookie(null)).toEqual({});
    expect(parseCollapsedCookie("")).toEqual({});
  });

  it("不正な値は空オブジェクトを返す", () => {
    expect(parseCollapsedCookie("not-json")).toEqual({});
    expect(parseCollapsedCookie(encodeURIComponent("123"))).toEqual({});
    expect(parseCollapsedCookie(encodeURIComponent('"string"'))).toEqual({});
  });
});
