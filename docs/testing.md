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

## 手動テスト

機能実装・修正後は `docs/manual-testing.md` の対応セクションを参照して動作確認を行う。

---

## テストデータ投入（Seed）

### 概要

`prisma/seed.ts` を使ってブックマークのテストデータを手動で投入できる。
ソート・検索などの動作確認に使用する。

### 実行

```bash
# DB の最初のユーザーにデータを投入（開発環境では通常これでOK）
npx tsx prisma/seed.ts

# 特定ユーザーに投入する場合
SEED_USER_EMAIL=your@email.com npx tsx prisma/seed.ts
```

### 注意事項

- 実行するたびにデータが追加される（重複チェックなし）
- データが増えすぎた場合は手動で削除する
