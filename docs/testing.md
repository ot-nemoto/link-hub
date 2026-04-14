# Testing

## 完了条件

| 対象 | 完了条件 |
|------|---------|
| ユーティリティ関数（`src/lib/`） | ユニットテストの作成をもって完了 |
| Server Actions（`"use server"` のファイル） | ユニットテストの作成をもって完了 |
| UI コンポーネント | 手動動作確認をもって完了（`docs/e2e-scenarios.md` 参照） |

---

## ユニットテスト（Vitest）

### 実行

```bash
npm test           # 一回実行
npm run test:watch # ウォッチモード
```

### 対象・方針

- `src/lib/` 配下のユーティリティ関数はユニットテスト必須
- テストファイルは実装ファイルと同じディレクトリに `[name].test.ts` で配置
- Prisma・Clerk 等の外部依存は `vi.mock` でモック化
- テストファイル先頭に `// @vitest-environment node` を付ける

---

## 手動テスト

機能実装・修正後は `docs/e2e-scenarios.md` の対応セクションを参照して動作確認を行う。

---

## テストデータ投入（Seed）

E2E テスト前にシードを実行してデータを初期化すること。詳細は [`docs/development.md` — テストデータ投入](development.md#テストデータ投入seed) を参照。
