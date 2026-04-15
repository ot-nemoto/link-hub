# Testing

## 完了条件

| 対象 | 完了条件 |
|------|---------|
| ユーティリティ関数（`src/lib/`） | ユニットテストの作成をもって完了 |
| Server Actions（`"use server"` のファイル） | ユニットテストの作成をもって完了 |
| UI コンポーネント | E2E テストの実施をもって完了（`docs/e2e-scenarios.md` 参照） |

---

## ユニットテスト（Vitest）

### 実行

```bash
npm test                          # 1回実行
npm run test:watch                # ウォッチモード（開発中）
npx vitest run --reporter=verbose # テストケース名を全て表示
npm run test:coverage             # カバレッジレポート出力
```

### 対象・方針

- `src/lib/` 配下のユーティリティ関数はユニットテスト必須
- テストファイルは実装ファイルと同じディレクトリに `[name].test.ts` で配置
- Prisma・Clerk 等の外部依存は `vi.mock` でモック化
- テストファイル先頭に `// @vitest-environment node` を付ける

### カバレッジ方針

#### Server Actions

| ケース | 条件 |
|--------|------|
| 正常系 | 期待する戻り値（`{}` または `{ id }` 等） |
| バリデーションエラー | `{ error }` を返す |
| 認可エラー | `{ error }` を返す |
| リソース未存在 | `{ error }` を返す（該当する場合） |

#### ユーティリティ関数

| ケース | 条件 |
|--------|------|
| 正常系 | 期待する戻り値 |
| 境界値・エッジケース | 空文字、フォーマット違反、範囲外の値など |

---

## E2E テスト（Playwright MCP）

### テストユーザー

シードデータの詳細は [`docs/development.md` — テストデータ投入](development.md#テストデータ投入seed) を参照。

| ユーザー | メールアドレス | パスワード | 用途 |
|---------|-------------|---------|------|
| User1 | `bonjiri@example.com` | `Yakitori2026` | 機能テスト全般 |
| User2 | `tsukune@example.com` | `Yakitori2026` | ユーザー分離確認 |

### 認証について

link-hub はロールなしのユーザー認証のため、**MOCK モードは使用せず実 Clerk 認証でログインして E2E テストを実施する**。

> `MOCK_USER_EMAIL` / `MOCK_USER_ID` が `.env.local` に設定されている場合は、コメントアウトしてからサーバーを起動すること。

### Playwright MCP への指示例

#### 機能テスト（User1 でログイン）

```text
以下の手順で E2E テストを実施してください。

## 事前準備
1. `npx tsx prisma/seed.ts` を実行してテストデータを初期化する
2. `.env.local` の `MOCK_USER_EMAIL` / `MOCK_USER_ID` がコメントアウトされていることを確認する
3. `npm run dev` でサーバーを起動する（ポート: 3000）

## 使用ユーザー
- メールアドレス: bonjiri@example.com
- パスワード: Yakitori2026

## テスト対象
docs/e2e-scenarios.md の [テストしたいセクション名] を参照してテストを実施してください。
```

#### ユーザー分離テスト（User1 → User2 に切り替え）

```text
以下の手順で E2E テスト（ユーザー分離確認）を実施してください。

## 事前準備
1. `npx tsx prisma/seed.ts` を実行してテストデータを初期化する
2. `.env.local` の `MOCK_USER_EMAIL` / `MOCK_USER_ID` がコメントアウトされていることを確認する
3. `npm run dev` でサーバーを起動する（ポート: 3000）

## テスト手順
1. bonjiri@example.com（パスワード: Yakitori2026）でログインし、ブックマーク一覧を確認する
2. ログアウトする
3. tsukune@example.com（パスワード: Yakitori2026）でログインし、bonjiri のブックマーク・タグが見えないことを確認する

## テスト対象
docs/e2e-scenarios.md の「ユーザー分離」を参照してテストを実施してください。
```

---

## テストデータ投入（Seed）

E2E テスト前にシードを実行してデータを初期化すること。詳細は [`docs/development.md` — テストデータ投入](development.md#テストデータ投入seed) を参照。

```bash
npx tsx prisma/seed.ts
```

### 注意事項

- Clerk にユーザーが存在しない場合は自動作成される（パスワード: `Yakitori2026`）
- 既存のブックマーク・タグは全削除されるため、手動で追加したデータは失われる
- `CLERK_SECRET_KEY` が `.env.local` に設定されていること
