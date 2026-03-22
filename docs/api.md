# API

## 共通仕様

- ベース URL: `/api`
- リクエスト/レスポンスは JSON 形式
- 全エンドポイントは Clerk 認証必須（未認証時は `401` を返す）
- ユーザーは自分のリソースのみ操作可能（他ユーザーのリソースへのアクセスは `403`）

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
