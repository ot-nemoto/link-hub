# 外部 REST API

外部連携用の REST API エンドポイント定義（API キー認証）。API キーがあれば UI を介さずブックマークを操作できる。

書き込み系の業務ロジックは `src/lib/` に集約し、Server Actions（UI 用）と REST API（外部用）が同じ関数を共有する。Server Actions の仕様は [`docs/actions.md`](actions.md) を参照。

## 認証

- `Authorization: Bearer <api-key>` ヘッダー必須
- API キーはアプリのヘッダー「API キー」モーダルで生成・再生成できる（1 ユーザー 1 キー・平文保持）
- キーが無効・未指定の場合は `401 Unauthorized`
- `/api/bookmarks(.*)` は `proxy.ts` の public ルートに含め、Clerk 認証ではなく API キー認証で保護する

## 共通仕様

- リクエスト・レスポンスボディはすべて JSON（`Content-Type: application/json`）
- ブックマークのレスポンス形式は全エンドポイント共通（下表）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | string | ブックマーク ID |
| `url` | string | URL |
| `title` | string | タイトル |
| `memo` | string \| null | メモ |
| `ogImage` | string \| null | OGP 画像 URL |
| `category` | `{ id, name }` \| null | カテゴリ（未分類は null） |
| `createdAt` | string | 作成日時（ISO 8601） |

### エラーレスポンス

`{ "error": "<メッセージ>" }` を返す。ステータスの割り当ては共通。

| ステータス | 条件 |
|-----------|------|
| 400 | バリデーションエラー（`url`/`title` 不正、`tagId` が文字列/null 以外、`ids` 未指定、ボディ不正 等） |
| 401 | API キーが未指定・無効 |
| 403 | 他ユーザーのリソースを操作しようとした |
| 404 | 対象リソースが存在しない |

## エンドポイント一覧

| メソッド | パス | 概要 |
|---------|------|------|
| `GET` | `/api/bookmarks` | ブックマーク一覧を取得 |
| `POST` | `/api/bookmarks` | ブックマークを作成 |
| `DELETE` | `/api/bookmarks?ids=a,b,c` | 複数ブックマークを一括削除（ゴミ箱へ） |
| `POST` | `/api/bookmarks/reorder` | 並び順を一括更新 |
| `GET` | `/api/bookmarks/trash` | ゴミ箱（削除済み）一覧を取得 |
| `DELETE` | `/api/bookmarks/trash` | ゴミ箱を空にする（完全削除） |
| `PATCH` | `/api/bookmarks/:id` | ブックマークを更新（カテゴリ移動を含む） |
| `DELETE` | `/api/bookmarks/:id` | ブックマークを削除（ゴミ箱へ） |
| `POST` | `/api/bookmarks/:id/restore` | ゴミ箱から復元 |

> 削除はソフトデリート（ゴミ箱へ移動）。カテゴリ API は別 Issue で追加予定。

---

## `GET /api/bookmarks` — 一覧取得

認証ユーザーの**未削除**ブックマークを配列で返す。

```bash
export LH_API_KEY="550e8400-e29b-41d4-a716-446655440000"
curl -s -H "Authorization: Bearer ${LH_API_KEY}" http://localhost:3000/api/bookmarks | jq
```

### レスポンス（200）

```json
{
  "bookmarks": [
    {
      "id": "clxxxx",
      "url": "https://example.com",
      "title": "Example",
      "memo": "メモ",
      "ogImage": "https://example.com/og.png",
      "category": { "id": "clyyyy", "name": "Frontend" },
      "createdAt": "2026-01-02T03:04:05.000Z"
    }
  ]
}
```

---

## `POST /api/bookmarks` — 作成

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `url` | string | ✅ | `http`/`https` の URL |
| `title` | string | ✅ | タイトル |
| `memo` | string | - | メモ |
| `ogImage` | string | - | OGP 画像 URL |
| `tagId` | string \| null | - | カテゴリ ID（`null` は未分類・他ユーザーのカテゴリは無視され未分類になる）。文字列/null 以外は 400 |
| `hideOgImage` | boolean | - | 一覧で OGP 画像を隠すか |

```bash
curl -s -X POST -H "Authorization: Bearer ${LH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","title":"Example","memo":"メモ"}' \
  http://localhost:3000/api/bookmarks | jq
```

### レスポンス（201）

作成されたブックマーク（共通形式）を返す。

---

## `DELETE /api/bookmarks?ids=a,b,c` — 一括削除

`ids` クエリにカンマ区切りの ID を指定し、まとめてゴミ箱へ移動する（ソフトデリート）。自ユーザー所有分のみが対象。

```bash
curl -s -X DELETE -H "Authorization: Bearer ${LH_API_KEY}" \
  "http://localhost:3000/api/bookmarks?ids=clxxxx,clyyyy"
```

### レスポンス（204）

ボディなし。

---

## `PATCH /api/bookmarks/:id` — 更新

リクエストボディは `POST` と同じ（`url`・`title` は必須）。`tagId` でカテゴリ移動が可能。`sortOrder`（並び順）は非対応（並び替えは別途 reorder API を予定）。

`url`・`title` 以外のフィールドは**キーを省略すると既存値を保持**し、明示的に送ると更新する（部分更新）:

- `tagId`: 省略で保持、`null` で未分類化
- `memo`: 省略で保持、空文字 `""` でクリア
- `ogImage`: 省略で保持
- `hideOgImage`: 省略で保持

```bash
curl -s -X PATCH -H "Authorization: Bearer ${LH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","title":"新しいタイトル","tagId":"clyyyy"}' \
  http://localhost:3000/api/bookmarks/clxxxx | jq
```

### レスポンス（200）

更新後のブックマーク（共通形式）を返す。

---

## `DELETE /api/bookmarks/:id` — 削除

対象ブックマークをゴミ箱へ移動する（ソフトデリート）。

```bash
curl -s -X DELETE -H "Authorization: Bearer ${LH_API_KEY}" \
  http://localhost:3000/api/bookmarks/clxxxx
```

### レスポンス（204）

ボディなし。

---

## `POST /api/bookmarks/reorder` — 並び替え

`ids` の並び順どおりに `sortOrder` を一括更新する。自ユーザー所有分のみ。

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `ids` | string[] | ✅ | 並べたい順のブックマーク ID 配列（文字列以外・空配列は 400） |

```bash
curl -s -X POST -H "Authorization: Bearer ${LH_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"ids":["clxxxx","clyyyy","clzzzz"]}' \
  http://localhost:3000/api/bookmarks/reorder
```

### レスポンス（200）

ボディなし。指定 ID に他ユーザーのものが含まれる場合は `403`。

---

## `GET /api/bookmarks/trash` — ゴミ箱一覧

削除済み（ソフトデリート）のブックマークを削除日時の降順で返す。形式は一覧取得と同じ。

```bash
curl -s -H "Authorization: Bearer ${LH_API_KEY}" \
  http://localhost:3000/api/bookmarks/trash | jq
```

### レスポンス（200）

`GET /api/bookmarks` と同じ `{ "bookmarks": [ ... ] }` 形式。

---

## `DELETE /api/bookmarks/trash` — ゴミ箱を空にする

ゴミ箱内のブックマークを**完全削除**する（物理削除・不可逆）。

```bash
curl -s -X DELETE -H "Authorization: Bearer ${LH_API_KEY}" \
  http://localhost:3000/api/bookmarks/trash
```

### レスポンス（204）

ボディなし。

---

## `POST /api/bookmarks/:id/restore` — 復元

ゴミ箱内のブックマークを元のカテゴリに復元する（`deletedAt` を解除）。

```bash
curl -s -X POST -H "Authorization: Bearer ${LH_API_KEY}" \
  http://localhost:3000/api/bookmarks/clxxxx/restore | jq
```

### レスポンス（200）

復元後のブックマーク（共通形式）を返す。未存在は `404`、他ユーザーのものは `403`。

---

# カテゴリ（Tags）API

カテゴリ（タグ）の一覧・作成・更新・削除・並び替え。認証・エラー形式は上記共通仕様に従う（同名カテゴリは **409**）。

## エンドポイント一覧

| メソッド | パス | 概要 |
|---------|------|------|
| `GET` | `/api/tags` | カテゴリ一覧を取得（`?withCount=true` で件数付き） |
| `POST` | `/api/tags` | カテゴリを作成 |
| `POST` | `/api/tags/reorder` | 並び順を一括更新 |
| `PATCH` | `/api/tags/:id` | カテゴリ名を変更 |
| `DELETE` | `/api/tags/:id` | カテゴリを削除 |

カテゴリのレスポンス形式:

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | string | カテゴリ ID |
| `name` | string | カテゴリ名 |
| `bookmarkCount` | number | 紐づく未削除ブックマーク件数（`?withCount=true` のときのみ） |

---

## `GET /api/tags` — 一覧取得

```bash
curl -s -H "Authorization: Bearer ${LH_API_KEY}" \
  "http://localhost:3000/api/tags?withCount=true" | jq
```

### レスポンス（200）

```json
{ "tags": [ { "id": "clyyyy", "name": "Frontend", "bookmarkCount": 3 } ] }
```

`?withCount=true` を付けない場合は `{ "tags": [ { "id", "name" } ] }`。

---

## `POST /api/tags` — 作成

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `name` | string | ✅ | カテゴリ名（空・50 字超は 400、同名は 409） |

```bash
curl -s -X POST -H "Authorization: Bearer ${LH_API_KEY}" \
  -H "Content-Type: application/json" -d '{"name":"Frontend"}' \
  http://localhost:3000/api/tags | jq
```

### レスポンス（201）

作成されたカテゴリ `{ "id", "name" }` を返す。同名が既に存在する場合は `409`。

---

## `POST /api/tags/reorder` — 並び替え

`ids` の並び順どおりに `sortOrder` を一括更新する。

```bash
curl -s -X POST -H "Authorization: Bearer ${LH_API_KEY}" \
  -H "Content-Type: application/json" -d '{"ids":["clyyyy","clzzzz"]}' \
  http://localhost:3000/api/tags/reorder
```

### レスポンス（200）

ボディなし。配列でない/空は `400`、他ユーザーの id を含む場合は `403`。

---

## `PATCH /api/tags/:id` — 名前変更

### リクエストボディ

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `name` | string | ✅ | 新しいカテゴリ名（空・50 字超は 400、別カテゴリと同名は 409） |

```bash
curl -s -X PATCH -H "Authorization: Bearer ${LH_API_KEY}" \
  -H "Content-Type: application/json" -d '{"name":"Backend"}' \
  http://localhost:3000/api/tags/clyyyy | jq
```

### レスポンス（200）

更新後のカテゴリ `{ "id", "name" }` を返す。未存在は `404`、他ユーザーのものは `403`。

---

## `DELETE /api/tags/:id` — 削除

カテゴリを削除する。紐づくブックマークの `tagId` は `null`（未分類）になる。

```bash
curl -s -X DELETE -H "Authorization: Bearer ${LH_API_KEY}" \
  http://localhost:3000/api/tags/clyyyy
```

### レスポンス（204）

ボディなし。未存在は `404`、他ユーザーのものは `403`。

---

# OGP 取得 API

## `GET /api/ogp?url=<url>` — OGP メタデータ取得

指定 URL の OGP メタデータ（タイトル・画像）を取得する。ブックマーク登録前のタイトル/画像の自動補完に使う。

- `url` 未指定・`http`/`https` 以外の形式は **400**
- **取得失敗・タイムアウト・SSRF ブロック（localhost / プライベート IP 等）でもエラーにせず、`{ title: null, image: null }` を 200 で返す**（ベストエフォート）

```bash
curl -s -H "Authorization: Bearer ${LH_API_KEY}" \
  "http://localhost:3000/api/ogp?url=https://example.com" | jq
```

### レスポンス（200）

```json
{ "title": "Example Domain", "image": "https://example.com/og.png" }
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `title` | string \| null | og:title（無ければ `<title>`）。取得できなければ null |
| `image` | string \| null | og:image の絶対 URL。取得できなければ null |
