# 外部 REST API

外部連携用の REST API エンドポイント定義（API キー認証）。

書き込み操作はすべて **Server Actions**（`actions.ts`）で実装している。Server Actions の仕様は [`docs/actions.md`](actions.md) を参照。

## 認証

- `Authorization: Bearer <api-key>` ヘッダー必須
- API キーはアプリのヘッダー「API キー」モーダルで生成・再生成できる（1 ユーザー 1 キー・平文保持）
- キーが無効・未指定の場合は `401 Unauthorized`
- `/api/bookmarks` は `proxy.ts` の public ルートに含め、Clerk 認証ではなく API キー認証で保護する

## エンドポイント一覧

| メソッド | パス | 概要 | 認証 |
|---------|------|------|------|
| `GET` | `/api/bookmarks` | 認証ユーザーのブックマーク一覧を取得 | API キー |

---

## `GET /api/bookmarks` — ブックマーク一覧取得

認証ユーザーの**未削除**ブックマークを JSON で返す。

**認証:** `Authorization: Bearer <api-key>` ヘッダー必須

### リクエスト例

API キーを環境変数に設定して呼び出す（キーはヘッダーの「API キー」モーダルで発行）。

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

| ステータス | ボディ | 条件 |
|-----------|--------|------|
| 401 | `{ "error": "Unauthorized" }` | API キーが未指定・無効 |
