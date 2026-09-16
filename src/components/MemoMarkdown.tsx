import { memo } from "react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { MEMO_ALLOWED_ELEMENTS, memoUrlTransform, remarkInlineOnly } from "@/lib/memo-markdown";

/** ブックマークのメモをインライン Markdown として描画する（一覧で行ごとに再パースしないよう memo 化） */
export const MemoMarkdown = memo(function MemoMarkdown({ text }: { text: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkInlineOnly, [remarkGfm, { singleTilde: false }], remarkBreaks]}
      allowedElements={MEMO_ALLOWED_ELEMENTS}
      unwrapDisallowed
      urlTransform={memoUrlTransform}
      components={{
        p: ({ children }) => <p className="[&+p]:mt-1">{children}</p>,
        a: ({ href, children }) =>
          href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-700 underline decoration-purple-300 hover:decoration-purple-700"
            >
              {children}
            </a>
          ) : (
            <span>{children}</span>
          ),
        // 画像は描画せず、入力した記法をそのままテキストで表示する（urlTransform 後の src ではなく元テキストを切り出す）
        img: ({ node, src, alt }) => {
          const pos = node?.position;
          const source = pos
            ? text.slice(pos.start.offset, pos.end.offset)
            : `![${alt ?? ""}](${src ?? ""})`;
          return <span>{source}</span>;
        },
        code: ({ children }) => (
          <code className="rounded bg-zinc-200/70 px-1 py-0.5 font-mono text-[11px] text-zinc-800">
            {children}
          </code>
        ),
      }}
    >
      {text}
    </Markdown>
  );
});
