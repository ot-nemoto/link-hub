# 外部 REST API

外部連携用の REST API（API キー認証）。API キーがあれば UI を介さずブックマーク・カテゴリを操作できる。

書き込み系の業務ロジックは `src/lib/` に集約し、Server Actions（UI 用）と REST API（外部用）が同じ関数を共有する。Server Actions の仕様は [`docs/actions.md`](actions.md) を参照。

## API リファレンス（仕様の正）

エンドポイントごとの詳細（リクエスト/レスポンススキーマ・パラメータ）は、**Zod スキーマ（`src/lib/schemas/`）から生成した OpenAPI 3.1 仕様**が正とする。

- **リファレンス（Stoplight Elements）: アプリ内 `/api-reference`（ログイン必須）**
- OpenAPI JSON: `/openapi.json`（実行時に生成。`servers` はアクセス元オリジンを反映）

リファレンス UI・OpenAPI JSON はアプリに同梱してホスティングする（外部の GitHub Pages 等には公開しない）。本ドキュメントは認証・共通仕様・エンドポイント一覧の概要にとどめ、フィールド単位の契約はリファレンスを参照する（重複を避け drift を防ぐため）。

## 認証

- `Authorization: Bearer <api-key>` ヘッダー必須
- API キーはアプリのヘッダー「API キー」モーダルで生成・再生成できる（1 ユーザー 1 キー・平文保持）
- キーが無効・未指定の場合は `401 Unauthorized`
- `/api/bookmarks(.*)`・`/api/tags(.*)`・`/api/ogp(.*)` は `proxy.ts` の public ルートに含め、Clerk 認証ではなく API キー認証で保護する

## 共通仕様

- リクエスト・レスポンスボディはすべて JSON（`Content-Type: application/json`）
- 削除はソフトデリート（ゴミ箱へ移動）。ゴミ箱の一覧・復元・完全削除を別途提供
- 未知のリクエストフィールドは受理して無視する（strip）
- **CORS 対応**: 任意オリジンから利用可（`Access-Control-Allow-Origin: *`）。API キー認証・Cookie 不使用のためオリジン制限は不要。プリフライト `OPTIONS` にも対応（`src/proxy.ts`）

### エラーレスポンス

`{ "error": "<メッセージ>" }` を返す。ステータスの割り当ては共通。

| ステータス | 条件 |
|-----------|------|
| 400 | バリデーションエラー（`url`/`title` 不正、`tagId`/`sortOrder` の型・範囲、`ids` 不正、ボディ不正 等） |
| 401 | API キーが未指定・無効 |
| 403 | 他ユーザーのリソースを操作しようとした |
| 404 | 対象リソースが存在しない（ブックマーク／指定した `tagId` のカテゴリ 等） |
| 409 | 同名カテゴリが既に存在する |

## エンドポイント一覧

| メソッド | パス | 概要 |
|---------|------|------|
| `GET` | `/api/bookmarks` | ブックマーク一覧を取得 |
| `POST` | `/api/bookmarks` | ブックマークを作成 |
| `DELETE` | `/api/bookmarks?ids=a,b,c` | 複数ブックマークを一括削除（ゴミ箱へ） |
| `POST` | `/api/bookmarks/reorder` | 並び順を一括更新 |
| `GET` | `/api/bookmarks/trash` | ゴミ箱（削除済み）一覧を取得 |
| `DELETE` | `/api/bookmarks/trash` | ゴミ箱を空にする（完全削除） |
| `PATCH` | `/api/bookmarks/:id` | ブックマークを更新（カテゴリ移動・並び順変更を含む） |
| `DELETE` | `/api/bookmarks/:id` | ブックマークを削除（ゴミ箱へ） |
| `POST` | `/api/bookmarks/:id/restore` | ゴミ箱から復元 |
| `GET` | `/api/tags` | カテゴリ一覧を取得（`?withCount=true` で件数付き） |
| `POST` | `/api/tags` | カテゴリを作成 |
| `POST` | `/api/tags/reorder` | カテゴリの並び順を一括更新 |
| `PATCH` | `/api/tags/:id` | カテゴリ名を変更 |
| `DELETE` | `/api/tags/:id` | カテゴリを削除（紐づくブックマークは未分類化） |
| `GET` | `/api/ogp?url=<url>` | 指定 URL の OGP メタデータ（タイトル・画像）を取得 |

## クイックスタート

```bash
export LH_API_KEY="<設定モーダルで発行したキー>"
export BASE="http://localhost:3000"

# 一覧取得
curl -s -H "Authorization: Bearer ${LH_API_KEY}" "$BASE/api/bookmarks" | jq

# 作成
curl -s -X POST -H "Authorization: Bearer ${LH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","title":"Example"}' \
  "$BASE/api/bookmarks" | jq
```

各エンドポイントのリクエスト/レスポンス詳細・全パラメータはアプリ内リファレンス `/api-reference`（ログイン必須）を参照。
