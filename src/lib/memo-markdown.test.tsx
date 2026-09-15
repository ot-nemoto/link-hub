// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoMarkdown } from "@/components/MemoMarkdown";
import { memoUrlTransform } from "./memo-markdown";

const render = (text: string) => renderToStaticMarkup(<MemoMarkdown text={text} />);

describe("memoUrlTransform", () => {
  it("http / https / mailto の絶対 URL はそのまま返す", () => {
    expect(memoUrlTransform("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(memoUrlTransform("http://example.com")).toBe("http://example.com");
    expect(memoUrlTransform("mailto:a@example.com")).toBe("mailto:a@example.com");
  });

  it("許可外スキーム・相対パス・不正な URL は undefined を返す", () => {
    expect(memoUrlTransform("javascript:alert(1)")).toBeUndefined();
    expect(memoUrlTransform("data:text/html,x")).toBeUndefined();
    expect(memoUrlTransform("ftp://example.com")).toBeUndefined();
    expect(memoUrlTransform("/bookmarks")).toBeUndefined();
    expect(memoUrlTransform("")).toBeUndefined();
  });
});

describe("MemoMarkdown", () => {
  describe("インライン記法", () => {
    it("太字・斜体・インラインコード・取り消し線を描画する", () => {
      const html = render("**太字** *斜体* `code` ~~消し~~");
      expect(html).toContain("<strong>太字</strong>");
      expect(html).toContain("<em>斜体</em>");
      expect(html).toContain(">code</code>");
      expect(html).toContain("<del>消し</del>");
    });

    it("リンクは新規タブ・noopener で描画する", () => {
      const html = render("[公式](https://example.com)");
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain(">公式</a>");
    });

    it("bare URL は自動リンク化する", () => {
      expect(render("see https://example.com/x")).toContain('href="https://example.com/x"');
    });

    it("改行を保持する（<br>）", () => {
      expect(render("1行目\n2行目")).toMatch(/1行目<br\/>\s*2行目/);
    });

    it("空行区切りは別段落になる", () => {
      expect(render("A\n\nB")).toMatch(/<p[^>]*>A<\/p>\s*<p[^>]*>B<\/p>/);
    });
  });

  describe("ブロック記法は解釈せずテキストのまま表示する", () => {
    it.each([
      ["見出し", "# 見出し", "# 見出し"],
      ["箇条書き", "- item", "- item"],
      ["番号付きリスト", "1. item", "1. item"],
      ["引用", "> quote", "&gt; quote"],
      ["水平線", "---", "---"],
      ["画像", "![alt](https://example.com/a.png)", "![alt](https://example.com/a.png)"],
      ["画像（相対パス）", "![alt](./rel.png)", "![alt](./rel.png)"],
      [
        "画像（title 付き）",
        '![a](https://example.com/a.png "t")',
        "![a](https://example.com/a.png &quot;t&quot;)",
      ],
      ["画像（許可外スキーム）", "![a](javascript:alert(1))", "![a](javascript:alert(1))"],
      ["テーブル", "| a | b |\n| - | - |", "| a | b |<br/>\n| - | - |"],
    ])("%s", (_name, input, expected) => {
      const html = render(input);
      expect(html).toContain(expected);
      expect(html).not.toMatch(/<(h[1-6]|ul|ol|li|blockquote|pre|hr|img|table)[\s>]/);
    });

    it("フェンスコードブロックは <pre> にならず、CommonMark のコードスパンとしてインラインコードになる", () => {
      const html = render("```\ncode\n```");
      expect(html).not.toContain("<pre");
      expect(html).toMatch(/<code[^>]*>code<\/code>/);
    });

    it("生 HTML は描画しない", () => {
      const html = render("<script>alert(1)</script><b>x</b>");
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("<b>");
    });
  });

  describe("リンクの安全性", () => {
    it("javascript: スキームのリンクは href を付けずテキスト表示する", () => {
      const html = render("[x](javascript:alert(1))");
      expect(html).not.toContain("href=");
      expect(html).not.toContain("javascript:");
      expect(html).toContain("<span>x</span>");
    });
  });
});
