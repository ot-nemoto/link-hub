# CLAUDE.md

開発の共通規約は `.claude/common-rules.md`（dev-commons から同期）に集約している。本ファイルはそれをインポートし、**このリポジトリ固有の情報のみ**を記載する。

@.claude/common-rules.md

---

## 作業開始時のチェックリスト

1. `docs/product.md` を読みプロダクトの目的・対象ユーザーを理解する（機能一覧は `README.md`）
2. `docs/architecture.md` で実装方針・設計判断・バージョン gotcha を確認する
3. `docs/ui.md` で画面仕様・UI 規約を確認する
4. `docs/development.md` で開発・デプロイ手順を確認する
5. API・DB・認証・Server Actions に触れる場合は `docs/api.md` / `docs/schema.md` / `docs/auth.md` / `docs/actions.md` を確認する
6. タスクの状態・実装順は GitHub Issues / Milestone で確認する

## 本リポジトリのドキュメント採否

- **必須ドキュメント**: `product` / `architecture` / `ui` / `development`
- **条件付き必須ドキュメント**: `api`（外部 REST API。フィールド単位の契約は生成した OpenAPI 仕様 `openapi.json` / 公開 Scalar リファレンスが正）/ `actions`（Server Actions を採用）/ `schema`（Prisma + PostgreSQL を利用）/ `auth`（Clerk 認証フロー）
  - 不採用: `kintone-fields`（外部データソース参照なし）/ `integrations`（外部サービス連携は認証の Clerk のみで `auth.md` に集約）/ `infra`（Vercel + Neon 構成は `architecture.md` / `development.md` に集約）

## テスト対象（このリポジトリ固有）

- ユニットテスト対象: `src/lib/`（ユーティリティ関数）・Server Actions（各 `actions.ts`）
- API ルート: `src/app/api/`（`route.ts`）を対象に含める

## テスト方針（このリポジトリ固有の補足）

> 基本のテストルール（Vitest・コロケーション・`vi.mock` + `clearAllMocks`・正常/異常系の分離・カバレッジ観点）は common-rules「テストルール」を正とする。以下は link-hub 固有の補足。

- 投資の優先度は **バックエンドの整合性（`lib/`・Server Actions・API ルート）> 型・lint >>> UI E2E**。UI E2E / コンポーネントテストは高コスト・低 ROI のため**書かない**
- UI は薄く保ち、非自明なロジックは `lib/` やカスタムフックに切り出してユニットテストする（「フロントは薄く、ロジックは lib へ」）
- テストファイルは**先頭に `// @vitest-environment node` を付ける**。`vi.mock("@/lib/prisma", ...)` で Prisma をモックする（直接参照しない場合は必要な `@/lib/*` をモックする）

### 種別ごとのカバレッジ観点

- **API ルート（`src/app/api/**/route.ts`）**: 正常系 / バリデーションエラー(400) / 認証エラー(401) / 認可エラー(403・該当時) / 未存在(404・該当時) / 重複(409・該当時)
- **ユーティリティ関数（`src/lib/`）**: 正常系 / 境界値・エッジケース（空文字・フォーマット違反・範囲外など）
- **Server Actions**: 正常系（戻り値）/ 未認証 redirect / lib の `{ error }` 返却 / 予期しない例外時の `{ error }`

## セキュリティルール（このリポジトリ固有）

common-rules には無い、link-hub 固有のセキュリティ規約。

- **ユーザーデータ分離**: DB アクセスは `where` に `userId` を含めて絞り込む、または取得後に所有者の `userId` を検証する。全 Server Action・API ルートでログイン済みユーザーの確認（`getSession()` / API キー認証）を行う
- **リクエストパラメータのユーザー ID を信頼しない**: 操作対象ユーザーは常にセッション（`getSession()`）から取得する
- **SQL**: `$queryRaw` / `$executeRaw` を文字列連結・未サニタイズ入力で組み立てない。未検証の入力を `orderBy` / 動的キー / フィールド名にそのまま使わない
- **XSS**: `dangerouslySetInnerHTML` は使用しない

## コーディング（このリポジトリ固有の補足）

- 内部コードやフレームワークが保証している箇所に防御的コード（不要な null チェック・型ガード）を追加しない
