# Testing

## ユニットテスト（Vitest）

### 実行

```bash
npm test           # 一回実行
npm run test:watch # ウォッチモード
```

### 対象・方針

- `src/app/api/` 配下の API ルートはユニットテスト必須
- `src/lib/` 配下のユーティリティ関数はユニットテスト必須
- テストファイルは実装ファイルと同じディレクトリに `[name].test.ts` で配置
- Prisma・Clerk 等の外部依存は `vi.mock` でモック化
- テストファイル先頭に `// @vitest-environment node` を付ける

---

## E2E テスト（Playwright）

### 初回セットアップ

devcontainer 内では `postCreateCommand` で自動セットアップされる。
手動で行う場合は以下を実行：

```bash
# システム依存ライブラリのインストール（sudo 必要）
npx playwright install-deps chromium

# Chromium ブラウザバイナリのダウンロード
npx playwright install chromium
```

> **注意**: `install-deps`（ライブラリ）と `install`（ブラウザバイナリ）は別コマンド。
> `install-deps` を実行すると既存のバイナリが削除される場合があるため、
> 必ず `install chromium` を後に実行すること。

### 実行

```bash
npm run test:e2e        # 全テスト実行
npm run test:e2e:ui     # UI モードで実行（インタラクティブ）

# プロジェクト単位で実行
npx playwright test --project=smoke          # 疎通確認のみ
npx playwright test --project=authenticated  # 認証済みテスト
npx playwright test --project=unauthenticated # 未認証テスト
```

### テスト構成

| プロジェクト | ポート | MOCK_USER_EMAIL | テストファイル |
|------------|--------|-----------------|--------------|
| `smoke` | 3000 / 3001 | なし / あり | `smoke.spec.ts` |
| `unauthenticated` | 3000 | なし | `auth.spec.ts` |
| `authenticated` | 3001 | `e2e@link-hub-test.example.com` | `bookmarks.spec.ts` |

### グローバルセットアップ・ティアダウン

- **`e2e/global-setup.ts`**: テスト実行前にテストユーザーを DB に upsert し、既存ブックマークをクリア
- **`e2e/global-teardown.ts`**: テスト実行後にテストユーザーのブックマークを削除

#### Prisma クライアントを使わない理由

E2E の global-setup は Playwright のメインプロセスで動作するが、
`@neondatabase/serverless` の `neon()` 関数は Next.js のランタイム環境外では
`process.env.DATABASE_URL` を正しく読み取れない場合がある（dotenvx v17 との相性）。

このため、`prisma db execute --stdin` CLI を `child_process.execSync` 経由で呼び出す方式を採用。
`prisma.config.ts` が環境変数を読み込む責務を持つため、確実に DB 接続できる。

### .env.local の設定

E2E テストは `.env.local` の `DATABASE_URL` と `DIRECT_URL` を使用する（Prisma CLI 経由）。
テスト専用ユーザーのメールアドレスを変更したい場合は `.env.local` に追記：

```env
E2E_USER_EMAIL="your-e2e-user@example.com"
```

未設定の場合は `e2e@link-hub-test.example.com` が使用される。

---

## テストデータ投入（Seed）

### 概要

`prisma/seed.ts` を使ってブックマークのテストデータを手動で投入できる。
ページネーション・ソート・検索などの動作確認に使用する。

### 実行

```bash
# DB の最初のユーザーにデータを投入（開発環境では通常これでOK）
npx tsx prisma/seed.ts

# 特定ユーザーに投入する場合
SEED_USER_EMAIL=your@email.com npx tsx prisma/seed.ts
```

### 注意事項

- 実行するたびにデータが追加される（重複チェックなし）
- ページネーションの検証には 21 件以上必要（`PAGE_SIZE = 20`）
- seed データは 22 件定義済みのため、1回実行するとページ 2 が表示される
- データが増えすぎた場合は手動で削除するか、E2E の global-teardown を参考に一括削除

### 2サーバー構成の背景

未認証リダイレクトテストと認証済みテストを同一サーバーで実施できないため、
ポート 3000（MOCK なし）とポート 3001（MOCK あり）の2サーバーを起動する。

`.next` ディレクトリのロック競合を防ぐため、ポート 3001 側は
`NEXT_DIST_DIR=.next-e2e` を指定して別の出力ディレクトリを使用する。
