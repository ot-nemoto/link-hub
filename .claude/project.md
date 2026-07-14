# project.md（このリポジトリ固有の情報）

> このファイルは **このリポジトリが所有** する。自由に編集してよく、dev-commons からは同期されない（上書きされない）。
> 共通ルールは `.claude/common-rules.md`（dev-commons が配布）にあり、ルートの `CLAUDE.md` が本ファイルと共に import する。
> 共通ルールと矛盾する記述は、import 順で後ろにある本ファイルの内容が優先される。

## 作業開始時のチェックリスト

1. `docs/product.md` を読みプロダクトの目的・対象ユーザーを理解する（機能一覧は `README.md`）
2. `docs/architecture.md` で実装方針・設計判断・バージョン gotcha を確認する
3. `docs/ui.md` で画面仕様・UI 規約を確認する
4. `docs/development.md` で開発・デプロイ手順を確認する
5. DB・認証・Server Actions に触れる場合は `docs/schema.md` / `docs/auth.md` / `docs/actions.md` を確認する。API 仕様は配信 OpenAPI spec（`/openapi.json`）／リファレンス UI（`/api-reference`）を正とする
6. タスクの状態・実装順は GitHub Issues / Milestone で確認する

## 本リポジトリのドキュメント採否

- **必須ドキュメント**: `product` / `architecture` / `ui` / `development`
- **条件付き必須ドキュメント**: `actions`（Server Actions を採用）/ `schema`（Prisma + PostgreSQL を利用）/ `auth`（Clerk 認証フロー）
  - **API**: 外部 REST API を提供するが、仕様は配信 OpenAPI spec ＋ リファレンス UI に一本化する（`docs/api.md` は持たない。詳細は `.claude/api-rules.md`）
  - 不採用: `kintone-fields`（外部データソース参照なし）/ `integrations`（外部サービス連携は認証の Clerk のみで `auth.md` に集約）/ `infra`（Vercel + Neon 構成は `architecture.md` / `development.md` に集約）

## テスト対象（このリポジトリ固有）

- ユニットテスト対象: `src/lib/`（ユーティリティ関数）・Server Actions（各 `actions.ts`）
- API ルート: `src/app/api/`（`route.ts`）を対象に含める

## テスト方針（このリポジトリ固有の補足）

> 基本のテストルール（Vitest・コロケーション・`vi.mock` + `clearAllMocks`・正常/異常系の分離・カバレッジ観点）は common-rules「テストルール」を正とする。バックエンドセキュリティ・API ルートのカバレッジ観点は `.claude/api-rules.md` を正とする。以下は link-hub 固有の補足。

- 投資の優先度は **バックエンドの整合性（`lib/`・Server Actions・API ルート）> 型・lint >>> UI E2E**。UI E2E / コンポーネントテストは高コスト・低 ROI のため**書かない**
- UI は薄く保ち、非自明なロジックは `lib/` やカスタムフックに切り出してユニットテストする（「フロントは薄く、ロジックは lib へ」）
- テストファイルは**先頭に `// @vitest-environment node` を付ける**。`vi.mock("@/lib/prisma", ...)` で Prisma をモックする（直接参照しない場合は必要な `@/lib/*` をモックする）

### Server Actions のカバレッジ観点（このリポジトリ固有）

| ケース | 条件 |
|--------|------|
| 正常系 | 期待する戻り値 |
| 未認証 | redirect すること |
| 業務エラー | lib の `{ error }` を返すこと |
| 予期しない例外 | `{ error }` を返すこと |
