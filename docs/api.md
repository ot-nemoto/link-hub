# API

## 役割分担

ブックマークの CRUD 操作は **Server Actions**（`actions.ts`）で実装している。REST API（`/api/bookmarks`）は現在も存在するが、UI からは Server Actions を呼び出す。

| 処理 | 実装方式 | 説明 |
|------|---------|------|
| ブックマーク CRUD（UI操作） | Server Actions (`actions.ts`) | フォーム送信・削除ボタン操作 |
| OGP 取得 | Server Actions (`fetchOgp.ts`) | URL 入力時にタイトル・画像を補完 |
| ブックマーク CRUD（REST API） | `/api/bookmarks` | 外部連携・テスト用途 |
| ユーザー同期 | `/api/users/sync` | Clerk ログイン後に DB 同期 |

---

## Server Actions 仕様

### `createBookmark(data)`

ブックマークを新規登録する。

**引数:** `{ url, title, memo, ogImage? }`

**戻り値:** `{}` | `{ error: string }`

**未認証時:** `/sign-in` へ redirect

---

### `updateBookmark(id, data)`

ブックマークを更新する。

**引数:** `id: string`, `{ url, title, memo, ogImage? }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| 未認証 | `/sign-in` へ redirect |
| `"ブックマークが見つかりません"` | 指定 ID が存在しない |
| `"権限がありません"` | 他ユーザーのブックマーク |

---

### `deleteBookmark(id, prevState)`

ブックマークを削除する。

**引数:** `id: string`, `prevState: { error?: string }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| 未認証 | `/sign-in` へ redirect |
| `"ブックマークが見つかりません"` | 指定 ID が存在しない |
| `"権限がありません"` | 他ユーザーのブックマーク |

---

### `deleteBookmarks(ids)`

複数ブックマークを一括削除する。自ユーザーのもの以外は削除されない。

**引数:** `ids: string[]`

**戻り値:** `{}` | `{ error: string }`

**未認証時:** `/sign-in` へ redirect

---

### `fetchOgp(url)`

指定 URL から OGP 情報を取得する。

**引数:** `url: string`

**戻り値:** `{ title?: string; image?: string }` | `{ error: string }`

| 戻り値 | 条件 |
|--------|------|
| `{ title, image }` | 正常取得（image は絶対 URL に解決済み） |
| `{ error: "取得できませんでした" }` | URLバリデーション失敗（非 http/https・localhost・プライベートIP等）・fetch 失敗・タイムアウト（3秒）・レスポンス異常 |

---

## REST API 共通仕様

- ベース URL: `/api`
- リクエスト/レスポンスは JSON 形式
- 全エンドポイントは Clerk 認証必須（未認証時は `401` を返す）
- ユーザーは自分のリソースのみ操作可能（他ユーザーのリソースへのアクセスは `403`）

---

## エラーレスポンス定義

### 形式

すべてのエラーレスポンスは以下の JSON 形式で返す。

```json
{ "error": "<メッセージ文字列 または バリデーションエラーオブジェクト>" }
```

バリデーションエラー（400）の場合は Zod の `flatten()` 形式を返す。

```json
{
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "url": ["Invalid url"],
      "title": ["String must contain at least 1 character(s)"]
    }
  }
}
```

### 共通ステータスコード

| ステータス | 意味 | 使用条件 |
|-----------|------|---------|
| 400 | Bad Request | バリデーションエラー（URL 形式不正、必須項目未入力など） |
| 401 | Unauthorized | 未認証（Clerk セッションなし） |
| 403 | Forbidden | 他ユーザーのリソースへのアクセス |
| 404 | Not Found | 指定 ID のリソースが存在しない |

---

## ユーザー

### POST /api/users/sync

ログイン後に Clerk ユーザー情報を DB に同期する（upsert）。

**リクエスト body:** なし（Clerk の `currentUser()` からサーバーサイドで取得）

**レスポンス:**

```json
// 201 Created（新規作成）または 200 OK（更新）
{
  "id": "string",
  "clerkId": "string",
  "email": "string",
  "name": "string"
}
```

---

## ブックマーク

### GET /api/bookmarks

ログインユーザーのブックマーク一覧を取得する。

**レスポンス:**

```json
// 200 OK
[
  {
    "id": "string",
    "url": "string",
    "title": "string",
    "memo": "string | null",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
]
```

---

### POST /api/bookmarks

ブックマークを新規登録する。

**リクエスト body:**

```json
{
  "url": "string (required, URL形式)",
  "title": "string (required, 1-200文字)",
  "memo": "string (optional, 最大1000文字)"
}
```

**レスポンス:**

```json
// 201 Created
{
  "id": "string",
  "url": "string",
  "title": "string",
  "memo": "string | null",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

**エラー:**

| ステータス | 条件 |
|-----------|------|
| 400 | バリデーションエラー（URL 形式不正、タイトル未入力など） |
| 401 | 未認証 |

---

### PUT /api/bookmarks/[id]

ブックマークを更新する。

**リクエスト body:**

```json
{
  "url": "string (optional)",
  "title": "string (optional)",
  "memo": "string | null (optional)"
}
```

**レスポンス:**

```json
// 200 OK
{
  "id": "string",
  "url": "string",
  "title": "string",
  "memo": "string | null",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

**エラー:**

| ステータス | 条件 |
|-----------|------|
| 400 | バリデーションエラー |
| 401 | 未認証 |
| 403 | 他ユーザーのブックマークへのアクセス |
| 404 | 指定 ID のブックマークが存在しない |

---

### DELETE /api/bookmarks/[id]

ブックマークを削除する。

**レスポンス:**

```json
// 200 OK
{ "message": "deleted" }
```

**エラー:**

| ステータス | 条件 |
|-----------|------|
| 401 | 未認証 |
| 403 | 他ユーザーのブックマークへのアクセス |
| 404 | 指定 ID のブックマークが存在しない |
