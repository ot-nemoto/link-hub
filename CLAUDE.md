# CLAUDE.md

> このファイルは dev-commons が配布するマニフェスト。直接編集しない（次回同期で上書きされる）。
> リポジトリ固有の情報は `.claude/project.md`（同期対象外・各リポジトリ所有）に記載する。

@.claude/common-rules.md
@.claude/api-rules.md
@.claude/project.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
