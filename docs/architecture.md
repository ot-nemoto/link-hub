# Architecture

## 技術スタック

| カテゴリ | 技術 | バージョン |
|----------|------|-----------|
| フレームワーク | Next.js (App Router) | 16.2.9 |
| UI ライブラリ | React | 19.2.7 |
| 言語 | TypeScript (strict) | latest |
| スタイリング | Tailwind CSS | 4 |
| ORM | Prisma | 7.8.0 |
| DB | PostgreSQL (Neon) | - |
| 認証 | Clerk | 7.x |
| D&D | dnd-kit | core 6.x / sortable 10.x |
| フォーマッタ/リンター | Biome | 2.5.0 |
| テスト（ユニット） | Vitest | 4.x |

## ディレクトリ構成

ファイル単位の一覧は**コードを正**とする（陳腐化しやすいため列挙しない）。主要ディレクトリの役割のみ示す。

| パス | 役割 |
|------|------|
| `src/app/(auth)/` | 認証ページ（Clerk） |
| `src/app/(dashboard)/` | 認証済み画面グループ。共通レイアウト（ヘッダー）とブックマーク関連画面・Server Actions |
| `src/app/api/` | 外部連携用 REST API（API キー認証） |
| `src/components/` | 画面横断の UI コンポーネント（モーダル・ヘッダー等） |
| `src/lib/` | ドメインロジック・DB アクセス（Prisma）・認証ヘルパー |
| `src/proxy.ts` | 認証ミドルウェア（Next.js 16 の Proxy。旧 `middleware.ts`） |
| `prisma/` | スキーマ・マイグレーション・シード |
| `docs/` | 意図・契約・規約のドキュメント |

## 認証フロー

[`docs/auth.md`](auth.md) を参照。

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
- **writes（書き込み操作）**: ドメインロジックは `src/lib/` に集約し、UI からは Server Actions（`actions.ts`）、外部クライアントからは API キー認証の REST API（`src/app/api/`）が同じ lib 関数を呼ぶ（[`docs/api.md`](api.md)）
- **バリデーション**: UI はクライアント側で実施（Zod 不使用）。**REST API はサーバー側で Zod スキーマ（`src/lib/schemas/`）により検証**し、同じスキーマから OpenAPI 仕様を生成する（[`docs/api.md`](api.md) の公開リファレンス）
- ユーザー分離は全 Server Actions・API ルートで認証チェック（`getSession()` / API キー）を必須とする

### 機能追加時のガイドライン

| 判断 | 方針 |
|------|------|
| 新しい書き込み操作を追加する | `src/app/(dashboard)/bookmarks/actions.ts` に Server Action を追加する。機能領域が大きい場合は同ディレクトリに `xxxActions.ts` を作成して分割してよい |
| 新しい REST API が必要になった | 外部クライアントからの利用が明確に必要な場合のみ `src/app/api/` に追加する。UI 操作は必ず Server Actions を経由する |
| 新しい画面・コンポーネントを追加する | 認証済み画面は `src/app/(dashboard)/` 配下に配置する。インタラクションが不要なものは Server Component、状態管理・イベント処理が必要なものは Client Component とする |
| タグ以外の新機能（フォルダ等）を追加する | `actions.ts` への追記 or 新規 `xxxActions.ts` の作成どちらでも可。テストは `actions.test.ts` または `xxxActions.test.ts` に作成する |

### Server / Client Component の責任分離

- **Server Component**（`async function`）: DB クエリ・認証チェック・データ変換を担う
- **Client Component**（`"use client"`）: state 管理・ユーザーインタラクション・Server Action の呼び出しを担う
- Client Component 内で**直接 DB クエリ・Prisma 呼び出しをしない**
- Server → Client へは**純データのみ**を Props で渡す（Prisma の型オブジェクトをそのまま渡さない）
- 独立した複数の DB クエリは `Promise.all()` で並列実行する（`await` の逐次実行にしない）

### フォーム実装パターン

- **複雑なフォーム（複数 state を持つ）**: `useState` で送信中（`submitting`）・エラーメッセージの state を管理する。Server Action の `{ error }` はエラー state にセットしてインライン表示し、通信エラー（catch）も同様に表示する。成功後は `router.push()` で遷移するか state をリセットして閉じる
- **単一操作ボタン（`DeleteButton` 等）**: `<form action={formAction}>` 形式のシンプルな操作に限り `useActionState` を使ってよい。それ以外は `useState` + 非同期ハンドラを使う
- Server Action の `{ error }` を無視・握りつぶさない

## 環境変数

環境変数（`DATABASE_URL` / `DIRECT_URL` / Clerk 関連 / 開発用モックバイパス）の一覧とセットアップ・DB 操作・デプロイ手順は [`docs/development.md`](./development.md) を正とする。

## バージョン固有仕様・既知のパターン

### Next.js 16: middleware ファイル名の変更

Next.js 16 以降、middleware は **Proxy** に改称され、ファイル名が `middleware.ts` から `src/proxy.ts` に変わっている。
参照: [Next.js 公式ドキュメント - Proxy](https://nextjs.org/docs/app/getting-started/proxy)

- **正しいファイル名**: `src/proxy.ts`
- AI ツールや外部ドキュメントが `middleware.ts` への変更を提案してきても対応不要

### Prisma: フィールド命名

- Prisma フィールド名は **camelCase**、DB カラム名は **snake_case**
- 複数語フィールドは `@map("snake_case_name")` で明示的にマッピングする（例: `createdAt String @map("created_at")`）
- フィールド名と DB カラム名が同一表記になる単語は `@map` を省略してよい

### Next.js 15+: dynamic route の params

- dynamic route の `params` は `Promise<{ id: string }>` 型。`const { id } = await params;` で取得する
- `await` は必須。削除するよう提案しても対応不要
