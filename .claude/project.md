# project.md（このリポジトリ固有の情報）

> このファイルは **このリポジトリが所有** する。自由に編集してよく、dev-commons からは同期されない（上書きされない）。
> 共通ルールは `.claude/common-rules.md`（全リポ普遍）と `.claude/api-rules.md`（API・バックエンド系）にあり、ルートの `CLAUDE.md` が本ファイルと共に import する。
> 共通ルールと矛盾する記述は、import 順で後ろにある本ファイルが優先される。
> ここに書くのは**このリポジトリでしか通用しない情報のみ**（採否・テスト対象・真に固有なもの）。共有できる規約は共有レイヤーにあるので重複させない。

## 本リポジトリのドキュメント採否

- **必須ドキュメント**: `product` / `architecture` / `ui` / `development`
- **条件付き（API・バックエンド系）**: `actions`（Server Actions）/ `schema`（Prisma + PostgreSQL）/ `auth`（Clerk）を採用。必須セクション等の規約は `.claude/api-rules.md` を正とする。API 仕様は配信 OpenAPI spec（`/openapi.json`）＋ リファレンス UI（`/api-reference`）に一本化（`docs/api.md` は持たない）
- **不採用**: `kintone-fields`（外部データソース参照なし）/ `integrations`（外部連携は Clerk のみで `auth.md` に集約）/ `infra`（Vercel + Neon は `architecture.md` / `development.md` に集約）

## テスト対象（このリポジトリ固有）

- ユニットテスト対象: `src/lib/`（ユーティリティ関数）・Server Actions（各 `actions.ts`）
- API ルート: `src/app/api/`（`route.ts`）を対象に含める
- Prisma を参照するテストは先頭に `// @vitest-environment node` を付け、`vi.mock("@/lib/prisma", ...)` でモックする（直接参照しない場合は必要な `@/lib/*` をモックする）
