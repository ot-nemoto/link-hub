# Architecture

## 技術スタック

| カテゴリ | 技術 | バージョン |
|----------|------|-----------|
| フレームワーク | Next.js (App Router) | 16.2.1 |
| UI ライブラリ | React | 19.2.4 |
| 言語 | TypeScript (strict) | latest |
| スタイリング | Tailwind CSS | 4 |
| ORM | Prisma | 7.5.0 |
| DB | PostgreSQL (Neon) | - |
| 認証 | Clerk | 7.x |
| バリデーション | Zod | latest |
| D&D | dnd-kit | core 6.x / sortable 10.x |
| フォーマッタ/リンター | Biome | 2.4.9 |
| テスト（ユニット） | Vitest | 4.x |

## ディレクトリ構成

```
link-hub/
├── src/
│   ├── app/
│   │   ├── (auth)/            # 認証ページ（Clerk）
│   │   ├── (dashboard)/       # 認証済み画面グループ
│   │   │   ├── layout.tsx     # ヘッダー・ログアウトボタン
│   │   │   ├── LogoutButton.tsx
│   │   │   └── bookmarks/          # ブックマーク関連画面
│   │   │       ├── page.tsx        # 一覧
│   │   │       ├── new/page.tsx    # 新規登録
│   │   │       ├── [id]/edit/page.tsx  # 編集
│   │   │       ├── tags/page.tsx       # タグ管理
│   │   │       ├── tags/TagsClient.tsx # タグ管理 Client Component
│   │   │       ├── actions.ts          # Server Actions（書き込み操作を集約）
│   │   │       ├── BookmarkForm.tsx
│   │   │       ├── BookmarkList.tsx
│   │   │       ├── BulkTagPanel.tsx    # 一括タグ付与パネル
│   │   │       ├── DeleteButton.tsx
│   │   │       ├── InlineTagEditor.tsx # インラインタグ編集
│   │   │       ├── TagFilter.tsx       # タグフィルターバー
│   │   │       ├── TagInput.tsx        # タグ入力・新規作成
│   │   │       ├── ThemeToggle.tsx
│   │   │       ├── UndoSnackbar.tsx
│   │   │       └── fetchOgp.ts
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
        └── Server Actions (reads → Prisma 直接, writes → actions.ts)
              └── Prisma ORM
                    └── PostgreSQL (Neon)
```

## 実装方針

- ページコンポーネントは Server Components を基本とし、インタラクションが必要な部分のみ Client Components を使用する
- **reads（データ取得）**: Server Components から Prisma を直接呼ぶ
- **writes（書き込み操作）**: Server Actions（`actions.ts`）に集約する。REST API は使用しない
- バリデーションは Zod を使用し、`src/lib/validations/` に集約する
- ユーザー分離は全 Server Actions で `getSession()` による認証チェックを必須とする

### 機能追加時のガイドライン

| 判断 | 方針 |
|------|------|
| 新しい書き込み操作を追加する | `src/app/(dashboard)/bookmarks/actions.ts` に Server Action を追加する。機能領域が大きい場合は同ディレクトリに `xxxActions.ts` を作成して分割してよい |
| 新しい REST API が必要になった | 外部クライアントからの利用が明確に必要な場合のみ `src/app/api/` に追加する。UI 操作は必ず Server Actions を経由する |
| 新しい画面・コンポーネントを追加する | 認証済み画面は `src/app/(dashboard)/` 配下に配置する。インタラクションが不要なものは Server Component、状態管理・イベント処理が必要なものは Client Component とする |
| タグ以外の新機能（フォルダ等）を追加する | `actions.ts` への追記 or 新規 `xxxActions.ts` の作成どちらでも可。テストは `actions.test.ts` または `xxxActions.test.ts` に作成する |

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

# ローカル開発用認証バイパス（任意、どちらか一方を設定）
# MOCK_USER_ID="<DB の users.id>"
# MOCK_USER_EMAIL="your@example.com"
```

セットアップ手順・DB 操作・デプロイ手順の詳細は [`docs/development.md`](./development.md) を参照。

## バージョン固有仕様・既知のパターン

### Next.js 16: middleware ファイル名の変更

Next.js 16 以降、middleware は **Proxy** に改称され、ファイル名が `middleware.ts` から `src/proxy.ts` に変わっている。
参照: [Next.js 公式ドキュメント - Proxy](https://nextjs.org/docs/app/getting-started/proxy)

- **正しいファイル名**: `src/proxy.ts`
- AI ツールや外部ドキュメントが `middleware.ts` への変更を提案してきても対応不要
