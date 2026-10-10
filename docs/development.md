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

### テストデータ投入（Seed・ローカル専用）

`prisma/seed.ts` を使って E2E テスト用のデータを投入できる。
実行のたびに対象ユーザーのブックマーク・タグを全削除してからデータを投入するため、テスト前に実行することでクリーンな状態を保証できる。

**ローカル専用**。本番・ステージングに対して実行してはならない。

```bash
SEED_ALLOW_DESTRUCTIVE=1 npx tsx prisma/seed.ts
```

#### 誤実行に対する歯止め

| 段 | 条件 | 回避方法 |
|----|------|---------|
| 1 | `SEED_ALLOW_DESTRUCTIVE=1` が未設定なら中断する | 上記のとおり明示的に付けて実行する |
| 2 | シード定義のユーザーが 1 件も存在しない DB なら中断する（本番 DB・未シードの新規 DB の可能性） | 意図した実行であれば `SEED_ALLOW_UNSEEDED_DB=1` を併せて前置する |
| — | `CLERK_SECRET_KEY` が `sk_test_` で始まらないなら中断する | 回避方法はない。シードは Clerk の開発インスタンスに対してのみ実行する |

> 2 段目は「定義外ユーザーの存在」ではなく「シード済みでないこと」で判定する。開発者本人のアカウントが混在しうるため、定義外ユーザーの存在自体は正常とみなす必要がある。
> 空の DB も通さない。削除対象が無くても、テストユーザーを既知のパスワードで作ってしまうため。
> Clerk の検証にオプトインフラグは用意しない。2 段のガードはどちらも DB しか見ないため「DB は dev・Clerk は本番」を止められず、パスワード同期は既存ユーザーに無条件で書き込む。live インスタンスにシードを流す正当な理由はないので、必要ならスクリプトを編集する摩擦を残す。

**バイパスフラグ 2 本（`SEED_ALLOW_DESTRUCTIVE` / `SEED_ALLOW_UNSEEDED_DB`）は `.env` に書かない。** 実行ごとにコマンドラインで前置する。`.env` に残すとガードが恒久的に満たされ、本番誤実行を防げなくなる（`.env` に居座りやすいことがガード 2 段目の存在理由そのものである）。`.env` に置くのは `SEED_PASSWORD` のみ。

新規 DB の初回シードだけは `SEED_ALLOW_UNSEEDED_DB=1` を併せて前置する。**初回シード後は付けない**（2 段目のガードが機能しなくなる）。

```bash
# 新規 DB の初回のみ
SEED_ALLOW_DESTRUCTIVE=1 SEED_ALLOW_UNSEEDED_DB=1 npx tsx prisma/seed.ts
```

#### 対象ユーザーと投入データ

| ユーザー | タグ | ブックマーク |
|---------|------|------------|
| `bonjiri@example.com` | Frontend, Backend | 6件（タグあり・タグなし混在） |
| `tsukune@example.com` | Design | 2件（ユーザー分離確認用） |
| `tebasaki@example.com` | Tools, Docs | 5件（破壊的操作テスト用） |

bonjiri のブックマークとタグの対応：

| タイトル | タグ | テスト観点 |
|---------|------|----------|
| Next.js | Frontend | タグフィルター |
| Vercel | Frontend | タグフィルター |
| Prisma | Backend | タグフィルター |
| Neon | Frontend | タグフィルター |
| GitHub | なし | タグなしフィルター |
| Playwright | なし | タグなしフィルター |

#### 注意事項

- Clerk にユーザーが存在しない場合は自動作成される。パスワードは環境変数 `SEED_PASSWORD` の値（`.env` に設定する）
- **既存の Clerk ユーザーにも `SEED_PASSWORD` を同期する**ため、値を変更したら次回シードで反映される
- **`SEED_PASSWORD` の変更は daily-hub / eval-hub にも影響する。** Clerk アプリとテストユーザーを 3 リポジトリで共有しているため、値を変えるときは 3 リポジトリ揃えて行う
- 既存のブックマーク・タグは全削除されるため、手動で追加したデータは失われる
- `CLERK_SECRET_KEY` が `.env` に設定されており、かつ **`sk_test_`（開発インスタンス）であること**

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

外部 REST API の仕様は、`src/lib/schemas/` の Zod スキーマを唯一の正として OpenAPI 3.1 を生成する（[`docs/api.md`](api.md)）。**リファレンスはアプリに同梱してホスティングし、外部 Pages 等には公開しない**。

- **OpenAPI JSON**: 実行時ルート `/openapi.json`（`src/app/openapi.json/route.ts`）が `buildOpenApiDocument()` で都度生成する。`servers` はリクエストのオリジンから自動導出するため、環境変数や生成物ファイルは不要
- **リファレンス UI**: `/api-reference`（`src/app/api-reference/route.ts`）が Stoplight Elements（CDN 版 Web Component）で `/openapi.json` を描画する
- いずれも **ログイン必須**（`proxy.ts` の Clerk 保護対象。public ルートには含めない）
- ローカルでは `npm run dev` 後に `http://localhost:3000/api-reference` で確認できる
