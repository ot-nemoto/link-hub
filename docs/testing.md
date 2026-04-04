# Testing

## 完了条件

| 対象 | 完了条件 |
|------|---------|
| ユーティリティ関数（`src/lib/`） | ユニットテストの作成をもって完了 |
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

### 概要

`prisma/seed.ts` を使って E2E テスト用のデータを投入できる。
実行のたびに対象ユーザーのブックマーク・タグを全削除してからデータを投入するため、テスト前に実行することでクリーンな状態を保証できる。

### 対象ユーザーと投入データ

| ユーザー | タグ | ブックマーク |
|---------|------|------------|
| `bonjiri@example.com` | Frontend, Backend | 6件（タグあり・タグなし・複数タグ混在） |
| `tsukune@example.com` | Design | 2件（ユーザー分離確認用） |

bonjiri のブックマークとタグの対応：

| タイトル | タグ | テスト観点 |
|---------|------|----------|
| Next.js | Frontend | タグフィルター |
| Vercel | Frontend | タグフィルター |
| Prisma | Backend | タグフィルター |
| Neon | Frontend + Backend | AND フィルター |
| GitHub | なし | タグなしフィルター |
| Playwright | なし | タグなしフィルター |

### 実行

E2E テスト前に必ず実行してデータを初期化すること。

```bash
npx tsx prisma/seed.ts
```

### 注意事項

- Clerk にユーザーが存在しない場合は自動作成される（パスワード: `Yakitori2026`）
- 既存のブックマーク・タグは全削除されるため、手動で追加したデータは失われる
- `CLERK_SECRET_KEY` が `.env.local` に設定されていること
