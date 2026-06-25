# Server Actions

## Action 一覧

| Action | 概要 | ファイル |
|--------|------|---------|
| `createBookmark(data)` | ブックマーク新規登録 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `updateBookmark(id, data)` | ブックマーク更新 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `moveBookmark(id, tagId, sortOrder, options?)` | ブックマークのカテゴリ移動・並び順更新 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `reorderBookmarks(ids, options?)` | ブックマークの並び順更新 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `deleteBookmark(id, prevState)` | ブックマーク削除 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `deleteBookmarks(ids)` | ブックマーク一括削除 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `createTag(name)` | カテゴリ新規作成 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `reorderTags(ids, options?)` | カテゴリの並び順更新 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `deleteTag(id)` | カテゴリ削除 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `fetchOgp(url)` | URL から OGP 情報を取得 | `src/app/(dashboard)/bookmarks/fetchOgp.ts` |

---

## 共通仕様

- Server Action は原則として先頭で `getSession()` を呼び出して認証チェックをする
- 未認証時は `/sign-in` へ redirect する
- ただし `fetchOgp(url)`（`bookmarks/fetchOgp.ts`）はユーザーデータを操作しない外部フェッチのため、この認証チェックの対象外とする
- 戻り値は少なくとも `error?: string` を含む型にする
- DB 変更後は `revalidatePath()` でキャッシュを更新する（`skipRevalidate` オプションが有効な場合を除く）
- `src/lib/` の関数が返す `{ error }` はそのまま返す。予期しないエラーは再 throw する

---

## ブックマーク操作（`src/app/(dashboard)/bookmarks/actions.ts`）

### `createBookmark(data)`

ブックマークを新規登録する。

**引数:** `{ url, title, memo, ogImage?, tagId?: string | null }`

**戻り値:** `{}` | `{ error: string }`

**未認証時:** `/sign-in` へ redirect

---

### `updateBookmark(id, data)`

ブックマークを更新する。

**引数:** `id: string`, `{ url, title, memo, ogImage?, tagId?: string | null }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| 未認証 | `/sign-in` へ redirect |
| `"ブックマークが見つかりません"` | 指定 ID が存在しない |
| `"権限がありません"` | 他ユーザーのブックマーク |

---

### `moveBookmark(id, tagId, sortOrder, options?)`

ブックマークを指定カテゴリに移動し、並び順を設定する。D&D によるカテゴリ間移動時に呼ばれる。

**引数:** `id: string`, `tagId: string | null`, `sortOrder: number`, `options?: { skipRevalidate?: boolean }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| 未認証 | `/sign-in` へ redirect |
| `"ブックマークが見つかりません"` | 指定 ID が存在しない |
| `"権限がありません"` | 他ユーザーのブックマーク |
| `"カテゴリが見つかりません"` | 指定 tagId に対応するカテゴリが存在しない |

**skipRevalidate:** `true` の場合、`revalidatePath()` をスキップする。D&D のオプティミスティック更新時に使用し、UI のロールバックを防ぐ。

---

### `reorderBookmarks(ids, options?)`

ブックマークの並び順を更新する。D&D 完了時に呼ばれる。

**引数:** `ids: string[]`（並び替え後の順序で並べた bookmark ID の配列）, `options?: { skipRevalidate?: boolean }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| 未認証 | `/sign-in` へ redirect |
| `"権限がありません"` | 他ユーザーのブックマークが含まれている |

**skipRevalidate:** `true` の場合、`revalidatePath()` をスキップする。

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

## カテゴリ操作（`src/app/(dashboard)/bookmarks/actions.ts`）

### `createTag(name)`

カテゴリを新規作成する。同一ユーザー内で name がユニーク。

**引数:** `name: string`

**戻り値:** `{ tag: { id, name } }` | `{ conflict: true, tag: { id, name } }` | `{ error: string }`

| 戻り値 | 条件 |
|--------|------|
| `{ tag }` | 正常作成 |
| `{ conflict: true, tag }` | 同名カテゴリが既に存在する（既存カテゴリを返す） |
| `{ error: "タグ名が不正です" }` | 名前が空、または 50 文字超 |
| `{ error: "タグの作成に失敗しました" }` | DB エラー（ユニーク制約違反を含む） |

**未認証時:** `/sign-in` へ redirect

---

### `reorderTags(ids, options?)`

カテゴリの並び順を更新する。D&D によるカテゴリ並び替え時に呼ばれる。

**引数:** `ids: string[]`（並び替え後の順序で並べた tag ID の配列）, `options?: { skipRevalidate?: boolean }`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| 未認証 | `/sign-in` へ redirect |
| `"権限がありません"` | 他ユーザーのカテゴリが含まれている |

**skipRevalidate:** `true` の場合、`revalidatePath()` をスキップする。

---

### `deleteTag(id)`

カテゴリを削除する。関連するブックマークの `tagId` は `SET NULL`（未分類）になる。

**引数:** `id: string`

**戻り値:** `{}` | `{ error: string }`

| エラー | 条件 |
|--------|------|
| 未認証 | `/sign-in` へ redirect |
| `"タグが見つかりません"` | 指定 ID が存在しない |
| `"権限がありません"` | 他ユーザーのカテゴリ |

---

## OGP 取得（`src/app/(dashboard)/bookmarks/fetchOgp.ts`）

### `fetchOgp(url)`

指定 URL から OGP 情報を取得する。

**引数:** `url: string`

**戻り値:** `{ title?: string; image?: string }` | `{ error: string }`

| 戻り値 | 条件 |
|--------|------|
| `{ title, image }` | 正常取得（image は絶対 URL に解決済み） |
| `{ error: "取得できませんでした" }` | URLバリデーション失敗・fetch 失敗・タイムアウト（3秒）・レスポンス異常 |
