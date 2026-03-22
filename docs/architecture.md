# Architecture

## 技術スタック

| カテゴリ | 技術 | バージョン |
|----------|------|-----------|
| フレームワーク | Next.js (App Router) | 16.1.6 |
| UI ライブラリ | React | 19.2.3 |
| 言語 | TypeScript (strict) | latest |
| スタイリング | Tailwind CSS | 4 |
| ORM | Prisma | 7.5.0 |
| DB | PostgreSQL (Neon) | - |
| 認証 | Clerk | latest |
| バリデーション | Zod | latest |
| フォーマッタ/リンター | Biome | 2.4.6 |
| テスト（ユニット） | Vitest | latest |
| テスト（E2E） | Playwright | latest |

## ディレクトリ構成

```
link-hub/
├── src/
│   ├── app/
│   │   ├── (auth)/            # 認証ページ（Clerk）
│   │   ├── bookmarks/         # ブックマーク一覧・操作ページ
│   │   └── api/
│   │       └── bookmarks/     # ブックマーク API ルート
│   ├── lib/
│   │   ├── prisma.ts          # Prisma クライアント
│   │   └── validations/       # Zod スキーマ
│   └── proxy.ts               # Next.js 16 middleware（旧 middleware.ts）
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docs/
├── biome.json
└── package.json
```

## 認証フロー

1. `src/proxy.ts`（middleware）で未認証リクエストを `/sign-in` にリダイレクト
2. Clerk の `currentUser()` / `auth()` でサーバーサイドのユーザー情報を取得
3. DB の `User` テーブルは Clerk の `clerkId` をキーに同期（初回ログイン時に upsert）

## データフロー

```
Client (Browser)
  └── Next.js App Router (React Server Components / Client Components)
        └── API Routes (src/app/api/)
              └── Prisma ORM
                    └── PostgreSQL (Neon)
```

## 実装方針

- ページコンポーネントは Server Components を基本とし、インタラクションが必要な部分のみ Client Components を使用する
- API ルートは `src/app/api/` 配下に配置し、ユニットテストを必須とする
- バリデーションは Zod を使用し、`src/lib/validations/` に集約する
- ユーザー分離は全 API ルートで `auth()` による `clerkId` チェックを必須とする

## デプロイフロー

```
git push origin develop
  → Vercel が自動検知
    → ビルド（next build）
      → Vercel にデプロイ
```

マイグレーションはビルドから分離し、手動で実施する（下記参照）。

## DB マイグレーション（手動運用）

### ローカル開発

```bash
# マイグレーションファイルを作成して適用
npx prisma migrate dev --name <migration-name>
```

### 本番環境

Vercel ダッシュボードの「Functions」>「Shell」、または devcontainer から本番の `DATABASE_URL` を設定した上で実行する。

```bash
npm run migrate
# 実行内容: prisma migrate deploy
```

> **注意**: 本番マイグレーションはデプロイ前に実施すること。アプリのデプロイと migrate deploy の順序は「migrate → deploy」が原則。

## 環境変数

```env
# Database（Neon）
DATABASE_URL=       # 接続プール URL（ランタイム用）
DIRECT_URL=         # 直接接続 URL（prisma migrate 用）

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/bookmarks
```

`DATABASE_URL` と `DIRECT_URL` の使い分けは Prisma 7 の要件に基づく。`DATABASE_URL` は接続プール URL（ランタイムクエリ用）、`DIRECT_URL` は直接接続 URL（`prisma migrate` 用）。
