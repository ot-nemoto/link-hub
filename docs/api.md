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
| 400 | バリデーションエラー（`url`/`title` 不正、`ids` 未指定、ボディ不正 等） |
| 401 | API キーが未指定・無効 |
| 403 | 他ユーザーのリソースを操作しようとした |
| 404 | 対象リソースが存在しない |

## エンドポイント一覧

| メソッド | パス | 概要 |
|---------|------|------|
| `GET` | `/api/bookmarks` | ブックマーク一覧を取得 |
| `POST` | `/api/bookmarks` | ブックマークを作成 |
| `DELETE` | `/api/bookmarks?ids=a,b,c` | 複数ブックマークを一括削除（ゴミ箱へ） |
| `PATCH` | `/api/bookmarks/:id` | ブックマークを更新（カテゴリ移動・並び順変更を含む） |
| `DELETE` | `/api/bookmarks/:id` | ブックマークを削除（ゴミ箱へ） |

> 削除はソフトデリート（ゴミ箱へ移動）。ゴミ箱の一覧・復元・完全削除、並び替え、カテゴリ API は別 Issue で追加予定。

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
| `tagId` | string \| null | - | カテゴリ ID（他ユーザーのカテゴリは無視され未分類になる） |
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

リクエストボディは `POST` と同じ（`url`・`title` は必須）。`tagId` と組み合わせてカテゴリ移動、`sortOrder` は非対応（並び替えは別途 reorder API を予定）。

- `tagId` を省略すると既存カテゴリを保持、`null` を指定すると未分類化する
- `ogImage` を省略すると既存値を保持する

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
