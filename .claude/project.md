# project.md（このリポジトリ固有の情報）

> このファイルは **このリポジトリが所有** する。自由に編集してよく、dev-commons からは同期されない（上書きされない）。
> 共通ルールは `.claude/common-rules.md`（全リポ普遍）と `.claude/api-rules.md`（API・バックエンド系）にあり、ルートの `CLAUDE.md` が本ファイルと共に import する。
> 共通ルールと矛盾する記述は、import 順で後ろにある本ファイルが優先される。
> ここに書くのは**このリポジトリでしか通用しない情報のみ**（採用する条件付き docs・テスト対象・真に固有なもの）。共有できる規約は共有レイヤーにあるので重複させない。

## 採用する条件付き docs

必須 docs（`product` / `architecture` / `ui` / `development`）は common-rules、API・バックエンド系 docs の必須セクションは api-rules を正とする。本リポジトリが追加で採用する docs:

| ファイル | 役割 |
|----------|------|
| （API 仕様） | 外部 REST API。配信 OpenAPI spec（`/openapi.json`）＋ リファレンス UI（`/api-reference`）に一本化（`docs/api.md` は持たない） |
| `docs/actions.md` | Server Actions 定義 |
| `docs/schema.md` | DB スキーマ（Prisma + PostgreSQL） |
| `docs/auth.md` | 認証フロー（Clerk） |

## テスト対象（このリポジトリ固有）

- ユニットテスト対象: `src/lib/`（ユーティリティ関数）・Server Actions（各 `actions.ts`）
- API ルート: `src/app/api/`（`route.ts`）を対象に含める
- Prisma を参照するテストは先頭に `// @vitest-environment node` を付け、`vi.mock("@/lib/prisma", ...)` でモックする（直接参照しない場合は必要な `@/lib/*` をモックする）
