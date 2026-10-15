# Architecture

## 技術スタック

> バージョンは `package.json` を正とする（本表には固定バージョン値を書かない）。

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js (App Router) |
| UI ライブラリ | React |
| 言語 | TypeScript (strict) |
| スタイリング | Tailwind CSS |
| ORM | Prisma |
| DB | PostgreSQL (Neon) |
| 認証 | Clerk |
| D&D | dnd-kit |
| フォーマッタ/リンター | Biome |
| テスト（ユニット） | Vitest |

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
- **writes（書き込み操作）**: ドメインロジックは `src/lib/` に集約し、UI からは Server Actions（`actions.ts`）、外部クライアントからは API キー認証の REST API（`src/app/api/`）が同じ lib 関数を呼ぶ（API 仕様はアプリ内 `/api-reference` を参照）
- **バリデーション**: UI はクライアント側で実施（Zod 不使用）。**REST API はサーバー側で Zod スキーマ（`src/lib/schemas/`）により検証**し、同じスキーマから OpenAPI 仕様を生成する。OpenAPI JSON は実行時ルート `/openapi.json`、リファレンス UI（Stoplight Elements）はアプリ内 `/api-reference`（ログイン必須）で提供する。API の概要・認証・共通仕様などの散文も spec の `info.description` に集約し、別途 API ドキュメントは持たない
- ユーザー分離は全 Server Actions・API ルートで認証チェック（`getSession()` / API キー）を必須とする
- **エラー分類の契約**: lib（`src/lib/`）が返す `{ error }` は**クライアント起因のエラー（不正入力・未存在・権限）に限る**。DB 障害などサーバー起因の失敗は `{ error }` にせず throw する
  - REST API はメッセージから 400 / 403 / 404 に変換し（`statusForError()`。既定は 400）、throw された例外は全ハンドラ共通のラッパーで `500 { "error": "Internal Server Error" }` にする（例外の内容はサーバーログのみに残す）
  - この契約があるので「既定 400」が成り立つ。lib にサーバー起因の失敗を `{ error }` で返す経路を足すと、クライアントに 400 として返ってしまう
  - ラッパーは Next.js の制御フロー例外（`redirect()` / `notFound()` 等）を `unstable_rethrow()` で先に再 throw する（500 に化けさせない）
  - 全ハンドラが `withApiErrorHandling` で包まれていることを構造テスト（`src/app/api/route-wrapping.test.ts`）で検査する。**判定はソースの文字列マッチではなく実体で行う**: ラッパーは返す関数に印（`WRAPPED` = `Symbol.for("link-hub.withApiErrorHandling")`）を付け、テストは `src/app/api/` 配下の `route.*`（`.ts` / `.tsx` / `.js` / `.jsx` / `.mts` / `.mjs`）を動的 import して、export された HTTP メソッドに印があるかを見る
    - export の書き方（`export function`・分割代入・`export *`・再 export・別ファイル定義・型注釈付き等）に依存しない。文字列で「包まれている形」を探す作りは想定した書き方の列挙になり、列挙漏れが素通りするため採らない（daily-hub で同じ理由により 3 回穴が出た）
    - テストはルートモジュールの import 時に実 DB へ触れないよう `@/lib/prisma` をモックする。ルートが import 時に外部へ触れるモジュールを増やしたら、モックも追加する
    - **検査の範囲**は「`src/app/api/` 配下」「上記の拡張子の `route.*`」「`GET` / `POST` / `PATCH` / `PUT` / `DELETE` / `OPTIONS` / `HEAD`」で決まる。この外にあるもの（`src/app/api/` 外のルート・`route.cts` 等の拡張子・一覧に無いメソッド）は検査されない。`/openapi.json`・`/api-reference` は外部 API の `{ error }` 契約の対象外のため、意図的に範囲外としている
    - 印は一番外側の関数にしか付かない。他の高階関数で重ねる場合は `withApiErrorHandling` を一番外側に置く（内側に置くと未包装と判定される）

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

## ファビコン取得の契約

一覧のファビコンは、外部の検索エンジン系ファビコンサービス（巡回されていないサイトでは表示できない）に依存せず、**ブックマーク保存時にブックマーク先のサイトから直接取得して DB（`Bookmark.favicon`）に保存**する（`ogImage` と同じ扱い）。表示時は保存済みの URL をブラウザが直接読むだけで、サーバーは関わらない。

- **取得タイミング**: URL 入力時の OGP 自動取得（`fetchOgpData()`、`src/lib/ogp.ts`）に相乗りする。HTML 取得は 1 回のみで、OGP とファビコンを同時に抽出する。URL を変更したときの再取得要否は `ogImage` に揃える（サーバー側では自動再取得せず、呼び出し側が渡した値をそのまま保存する）
- **取得順序・優先順位**:
  1. 取得した HTML から `<link rel="icon">` → `rel="shortcut icon"` → `rel="apple-touch-icon"` の優先順位で `href` を採用する（同じ rel が複数ある場合は出現順で先頭を採用）。相対パスはリダイレクト後の最終 URL を基準に絶対 URL化する
  2. `<link>` が見つからない場合は `<オリジン>/favicon.ico` を取得し、`Content-Type` が `image/*` の場合だけ採用する（本文は読み切らずヘッダーのみ確認。SPA 等で HTML が返るケースを弾くため）
  3. どちらも無ければ `favicon` は NULL のままにする
- **SSRF 対策**: `isAllowedUrl()`（http/https 以外・プライベート/ループバック/リンクローカル等の遮断）を HTML 取得・`/favicon.ico` 取得の両方に適用する。**リダイレクトは `redirect: "manual"` で 1 ホップずつ手動追跡し、各ホップで `isAllowedUrl()` を再検査する**（`fetch` 既定の自動追従では転送先を検査できず、外部ホストから内部アドレスへのリダイレクトが素通りするため）。ホップ数は上限 5 回。タイムアウト（3 秒）は HTML 取得と `/favicon.ico` フォールバックを合わせた `fetchOgpData()` 呼び出し全体で 1 つの `AbortSignal` を共有する（ホップごとに個別のタイムアウトを割り当てると、リダイレクトを重ねるたびに許容時間が線形に伸びてしまうため）。HTML の受信サイズは 300KB で打ち切る
  - DNS rebinding（ホスト名の DNS 解決結果が後からプライベートアドレスに変わるケース）への対策は本実装では見送っている。発生頻度・影響に対してオオゴト過ぎるため、ホスト名ベースの検査で十分と判断した
- **表示**: `favicon` が http/https の有効な URL ならそれを使う（`getFaviconDisplayUrl()`、`src/lib/domain-groups.ts`）。NULL・不正な値の場合は従来どおり Google のファビコンサービス（`getFaviconUrl()`）にフォールバックする。読み込み失敗時は `GlobeIcon` を表示する（`onError` ハンドリングは既存のまま）
- **既存データ**: 列が NULL のままでも表示は退行しない（Google サービスへフォールバックするため）。一括取得は `prisma/backfill-favicons.ts` を手動実行する（手順は `docs/development.md` 参照）

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
