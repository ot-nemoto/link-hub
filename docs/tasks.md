# Tasks

## フェーズ構成

| フェーズ | 内容 | Milestone |
|---------|------|-----------|
| Phase 1 | インフラ・認証基盤 | [Milestone: Phase 1](../../milestones/1) |
| Phase 2 | ブックマーク機能 | [Milestone: Phase 2](../../milestones/2) |

---

## Phase 1: インフラ・認証基盤

Next.js プロジェクトの初期設定、Clerk 認証、Prisma/DB 接続を構築する。

**含む作業の概要:**
- Next.js 16 + TypeScript + Tailwind CSS + Biome のプロジェクト初期化
- Clerk 認証の設定（`src/proxy.ts` による保護、サインイン/アップページ）
- Prisma スキーマ定義（User モデル）と DB マイグレーション
- ユーザー同期 API（`POST /api/users/sync`）の実装とテスト
- devcontainer 設定

---

## Phase 2: ブックマーク機能

ブックマークの CRUD 機能と UI を実装する。

**含む作業の概要:**
- Prisma スキーマへの Bookmark モデル追加・マイグレーション
- ブックマーク API の実装とテスト（GET / POST / PUT / DELETE）
- ブックマーク一覧ページ（`/bookmarks`）の UI 実装
- ブックマーク登録・編集フォームの UI 実装
- 動作確認・E2E テスト
