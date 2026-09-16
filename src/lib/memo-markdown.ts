import type { Options } from "react-markdown";

/** react-markdown の remarkPlugins 要素のうち関数形式のもの（unified の Plugin。unified を直接依存に持たないため導出する） */
type RemarkPlugin = Extract<
  NonNullable<Options["remarkPlugins"]>[number],
  (...args: never[]) => unknown
>;

/**
 * メモの Markdown 描画で許可する HTML 要素（react-markdown の allowedElements）。
 * インライン記法のみ対応し、ブロック要素は remarkInlineOnly で構文レベルでも無効化する二重ガード。
 */
export const MEMO_ALLOWED_ELEMENTS = ["p", "strong", "em", "code", "a", "del", "br", "img"];

/** メモのリンクとして許可するスキーム */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/**
 * react-markdown の urlTransform。
 * 絶対 URL で http / https / mailto のもののみ通し、それ以外（javascript: や相対パス等）は
 * undefined を返して href を付けない（テキストとして表示される）。
 */
export function memoUrlTransform(url: string): string | undefined {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * ブロック記法（見出し・リスト・引用・コードブロック・水平線・HTML・定義・テーブル・脚注）を
 * micromark の construct 単位で無効化する remark プラグイン。
 * 無効化した記法はパースされず、入力したままのテキストとして表示される。
 * 画像は構文としては通し、MemoMarkdown 側で入力どおりのテキストに戻して描画する
 * （構文を無効化すると `!` + リンクに分解されてしまうため）。
 */
export const remarkInlineOnly: RemarkPlugin = function () {
  const data = this.data() as { micromarkExtensions?: unknown[] };
  data.micromarkExtensions ??= [];
  data.micromarkExtensions.push({
    disable: {
      null: [
        "headingAtx",
        "setextUnderline",
        "list",
        "blockQuote",
        "codeFenced",
        "codeIndented",
        "thematicBreak",
        "htmlFlow",
        "htmlText",
        "definition",
        "table",
        "gfmFootnoteDefinition",
        "gfmFootnoteCall",
      ],
    },
  });
};
