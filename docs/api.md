# API

## 役割分担

書き込み操作はすべて **Server Actions**（`actions.ts`）で実装する。REST API は存在しない。

| 処理 | 実装方式 | 説明 |
|------|---------|------|
| ブックマーク CRUD | Server Actions (`actions.ts`) | 作成・更新・削除・並び替え・タグ更新 |
| タグ CRUD | Server Actions (`actions.ts`) | 作成・削除・一括付与 |
| OGP 取得 | Server Actions (`fetchOgp.ts`) | URL 入力時にタイトル・画像を補完 |

---

## Server Actions 仕様

### `createBookmark(data)`

ブックマークを新規登録する。

**引数:** `{ url, title, memo, ogImage?, tagIds?: string[] }`

**戻り値:** `{}` | `{ error: string }`

**未認証時:** `/sign-in` へ redirect

---

### `updateBookmark(id, data)`

ブックマークを更新する。

**引数:** `id: string`, `{ url, title, memo, ogImage?, tagIds?: string[] }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| 未認証 | `/sign-in` へ redirect |
| `"ブックマークが見つかりません"` | 指定 ID が存在しない |
| `"権限がありません"` | 他ユーザーのブックマーク |

---

### `updateBookmarkTags(id, tagIds)`

ブックマークのタグを上書き更新する。

**引数:** `id: string`, `tagIds: string[]`

**戻り値:** `{}` | `{ error: string }`

---

### `reorderBookmarks(ids)`

ブックマークの並び順を更新する。D&D 完了時に呼ばれる。

**引数:** `ids: string[]`（並び替え後の順序で並べた bookmark ID の配列）

**戻り値:** `{}` | `{ error: string }`

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

### `createTag(name)`

タグを新規作成する。同一ユーザー内で name がユニーク。

**引数:** `name: string`

**戻り値:** `{ tag: { id, name } }` | `{ conflict: true, tag: { id, name } }` | `{ error: string }`

| 戻り値 | 条件 |
|--------|------|
| `{ tag }` | 正常作成 |
| `{ conflict: true, tag }` | 同名タグが既に存在する（既存タグを返す） |
| `{ error }` | バリデーションエラー・作成失敗 |

---

### `deleteTag(id)`

タグを削除する。関連する BookmarkTag も CASCADE 削除される。

**引数:** `id: string`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| `"タグが見つかりません"` | 指定 ID が存在しない |
| `"権限がありません"` | 他ユーザーのタグ |

---

### `bulkAddTags(bookmarkIds, tagIds)`

複数ブックマークにタグを一括付与する。既存タグは維持される。

**引数:** `bookmarkIds: string[]`, `tagIds: string[]`

**戻り値:** `{}` | `{ error: string }`

---

### `fetchOgp(url)`

指定 URL から OGP 情報を取得する。

**引数:** `url: string`

**戻り値:** `{ title?: string; image?: string }` | `{ error: string }`

| 戻り値 | 条件 |
|--------|------|
| `{ title, image }` | 正常取得（image は絶対 URL に解決済み） |
| `{ error: "取得できませんでした" }` | URLバリデーション失敗・fetch 失敗・タイムアウト（3秒）・レスポンス異常 |

