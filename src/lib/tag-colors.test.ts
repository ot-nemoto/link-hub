// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getTagColor } from "./tag-colors";

describe("getTagColor", () => {
  it("同名タグで常に同じ色を返す", () => {
    const color1 = getTagColor("開発");
    const color2 = getTagColor("開発");
    expect(color1).toEqual(color2);
  });

  it("パレット範囲内の色を返す", () => {
    const tags = [
      "開発",
      "CSS",
      "ツール",
      "デザイン",
      "API",
      "DB",
      "",
      "あ",
      "very-long-tag-name-test",
    ];
    for (const tag of tags) {
      const color = getTagColor(tag);
      expect(color).toHaveProperty("bg");
      expect(color).toHaveProperty("text");
      expect(color).toHaveProperty("activeBg");
      expect(color.bg).toMatch(/^bg-\w+-50$/);
      expect(color.text).toMatch(/^text-\w+-800$/);
      expect(color.activeBg).toMatch(/^bg-\w+-600$/);
    }
  });

  it("異なるタグ名で異なる色が返るケースがある", () => {
    const colors = new Set(
      ["開発", "CSS", "ツール", "デザイン", "API", "DB"].map((t) => getTagColor(t).bg),
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});
