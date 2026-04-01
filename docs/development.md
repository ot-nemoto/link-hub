# Development

## ローカルセットアップ

### 前提条件

- Node.js 20+
- npm
- PostgreSQL（Neon アカウント）

### セットアップ手順

```bash
# 依存パッケージのインストール
npm install

# Prisma クライアントの生成
npx prisma generate

# 開発サーバーの起動
npm run dev
```

---

## 環境変数

`.env.local` をプロジェクトルートに作成し、以下の変数を設定する。

```env
# Database（Neon）
DATABASE_URL=       # 接続プール URL（ランタイム用）
DIRECT_URL=         # 直接接続 URL（prisma migrate 用）

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/bookmarks

# ローカル開発用認証バイパス（任意、どちらか一方を設定）
# MOCK_USER_ID="<DB の users.id>"
# MOCK_USER_EMAIL="your@example.com"
```

`DATABASE_URL` と `DIRECT_URL` の使い分けは Prisma 7 の要件に基づく。`DATABASE_URL` は接続プール URL（ランタイムクエリ用）、`DIRECT_URL` は直接接続 URL（`prisma migrate` 用）。

### ローカル開発用認証バイパス

Clerk 認証なしで動作確認するため、`MOCK_USER_ID` または `MOCK_USER_EMAIL` を `.env.local` に設定する。

```env
# DB の users.id を指定する場合
MOCK_USER_ID="<DB の users.id>"

# メールアドレスを指定する場合
MOCK_USER_EMAIL="your@example.com"
```

- 設定すると `src/proxy.ts`（middleware）が Clerk 認証をスキップし、`src/lib/auth.ts` の `getSession()` が DB から直接ユーザーを返す
- **優先順位**: `MOCK_USER_ID` > `MOCK_USER_EMAIL`（両方設定した場合は `MOCK_USER_ID` が使われる）
- **本番環境（`NODE_ENV=production`）では設定しても無効**
- どちらも設定されていない場合は通常の Clerk 認証フローが動作する

---

## DB 操作

### マイグレーション（ローカル開発）

```bash
# マイグレーションファイルを作成して適用
npx prisma migrate dev --name <migration-name>
```

### テストデータ投入（Seed）

```bash
# DB の最初のユーザーにデータを投入（開発環境では通常これでOK）
npx tsx prisma/seed.ts

# 特定ユーザーに投入する場合
SEED_USER_EMAIL=your@email.com npx tsx prisma/seed.ts
```

- 実行するたびにデータが追加される（重複チェックなし）
- データが増えすぎた場合は手動で削除する

---

## デプロイ手順

### アプリのデプロイ

`develop` ブランチへの push で Vercel が自動検知しデプロイする。

```
git push origin develop
  → Vercel が自動検知
    → ビルド（next build）
      → Vercel にデプロイ
```

### 本番マイグレーション

**アプリデプロイ前に必ず実施する（順序: migrate → deploy）**

Vercel ダッシュボードの「Functions」>「Shell」、または devcontainer から本番の `DATABASE_URL` を設定した上で実行する。

```bash
npm run migrate
# 実行内容: prisma migrate deploy
```
