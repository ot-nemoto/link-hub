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

**E2E テストはシード実行済みであることを前提とする。** シードの実行方法は [`docs/development.md` — テストデータ投入](development.md#テストデータ投入seed) を参照。

| ユーザー | メールアドレス | パスワード | 用途 |
|---------|-------------|---------|------|
| User1 | `bonjiri@example.com` | `Yakitori2026` | 機能テスト全般 |
| User2 | `tsukune@example.com` | `Yakitori2026` | ユーザー分離確認 |
| User3 | `tebasaki@example.com` | `Yakitori2026` | 破壊的操作テスト（削除・一括削除・空状態確認） |

### 実施方法

テスト対象の URL と [`docs/e2e-scenarios.md`](e2e-scenarios.md) のシナリオをモデルに渡して実施する。
