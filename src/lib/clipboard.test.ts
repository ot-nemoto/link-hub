// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "./clipboard";

describe("copyToClipboard", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", { clipboard: { writeText } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("クリップボードへ書き込んで true を返す", async () => {
    writeText.mockResolvedValue(undefined);
    await expect(copyToClipboard("https://example.com/docs")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.com/docs");
  });

  it("空文字は書き込まず false を返す", async () => {
    await expect(copyToClipboard("")).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("Clipboard API が使えない場合は false を返す", async () => {
    vi.stubGlobal("navigator", {});
    await expect(copyToClipboard("https://example.com")).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("navigator 自体が存在しない場合は false を返す", async () => {
    vi.stubGlobal("navigator", undefined);
    await expect(copyToClipboard("https://example.com")).resolves.toBe(false);
  });

  it("書き込みが失敗した場合は false を返す", async () => {
    writeText.mockRejectedValue(new Error("NotAllowedError"));
    await expect(copyToClipboard("https://example.com")).resolves.toBe(false);
  });
});
