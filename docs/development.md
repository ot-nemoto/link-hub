# Development

## ローカルセットアップ

### 前提条件

- Node.js 20+
- npm
- PostgreSQL（Neon アカウント）

### セットアップ手順

```bash
# 1. 依存パッケージのインストール
npm install

# 2. .env を作成し、環境変数を設定する（下の「環境変数」節を参照）
#    ※ DATABASE_URL・DIRECT_URL の設定が必須

# 3. Prisma クライアントの生成（DIRECT_URL の設定が必要）
npx prisma generate

# 4. 開発サーバーの起動（DATABASE_URL の設定が必要）
npm run dev
```

---

## 環境変数

`.env` をプロジェクトルートに作成し、以下の変数を設定する。

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

Clerk 認証なしで動作確認するため、`MOCK_USER_ID` または `MOCK_USER_EMAIL` を `.env` に設定する。

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

`prisma/seed.ts` を使って E2E テスト用のデータを投入できる。
実行のたびに対象ユーザーのブックマーク・タグを全削除してからデータを投入するため、テスト前に実行することでクリーンな状態を保証できる。

```bash
npx tsx prisma/seed.ts
```

#### 対象ユーザーと投入データ

| ユーザー | タグ | ブックマーク |
|---------|------|------------|
| `bonjiri@example.com` | Frontend, Backend | 6件（タグあり・タグなし・複数タグ混在） |
| `tsukune@example.com` | Design | 2件（ユーザー分離確認用） |
| `tebasaki@example.com` | Tools, Docs | 5件（破壊的操作テスト用） |

bonjiri のブックマークとタグの対応：

| タイトル | タグ | テスト観点 |
|---------|------|----------|
| Next.js | Frontend | タグフィルター |
| Vercel | Frontend | タグフィルター |
| Prisma | Backend | タグフィルター |
| Neon | Frontend + Backend | AND フィルター |
| GitHub | なし | タグなしフィルター |
| Playwright | なし | タグなしフィルター |

#### 注意事項

- Clerk にユーザーが存在しない場合は自動作成される（パスワード: `Yakitori2026`）
- 既存のブックマーク・タグは全削除されるため、手動で追加したデータは失われる
- `CLERK_SECRET_KEY` が `.env` に設定されていること

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

## API リファレンス（OpenAPI）

外部 REST API の仕様は、`src/lib/schemas/` の Zod スキーマを唯一の正として OpenAPI 3.1 を生成する（[`docs/api.md`](api.md) / 公開リファレンス）。

```bash
# openapi.json を生成（生成物は gitignore）
npm run gen:openapi

# 本番 API URL を servers に含める場合
OPENAPI_SERVER_URL="https://<本番URL>" npm run gen:openapi
```

- 公開ページは Scalar で描画し、GitHub Actions（`.github/workflows/deploy-openapi-github-pages.yml`）が `develop` への push 時に **GitHub Pages** へデプロイする（公開 URL: `https://ot-nemoto.github.io/link-hub/`）
- 初回のみ、リポジトリ Settings → Pages → **Source = GitHub Actions** を有効化する必要がある
- 本番 URL を出す場合はリポジトリ変数 `OPENAPI_SERVER_URL` を設定する
