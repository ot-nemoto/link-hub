# Server Actions

各アクションの**引数・戻り値・エラーの詳細はコードとユニットテストを正**とする（`src/app/(dashboard)/**/actions.ts` ・ `api-key-actions.ts` ・ 各 `*.test.ts`）。本ドキュメントはアクションの一覧と共通仕様のみを記載する。

## Action 一覧

| Action | 概要 | ファイル |
|--------|------|---------|
| `createBookmark(data)` | ブックマーク新規登録 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `updateBookmark(id, data)` | ブックマーク更新 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `moveBookmark(id, tagId, sortOrder, options?)` | ブックマークのタグ移動・並び順更新 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `reorderBookmarks(ids, options?)` | ブックマークの並び順更新 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `deleteBookmark(id, prevState)` | ブックマーク削除（ソフトデリート＝ゴミ箱へ移動） | `src/app/(dashboard)/bookmarks/actions.ts` |
| `deleteBookmarks(ids)` | ブックマーク一括削除（ソフトデリート） | `src/app/(dashboard)/bookmarks/actions.ts` |
| `restoreBookmark(id)` | ゴミ箱からブックマークを復元 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `emptyTrash()` | ゴミ箱内を完全削除（物理削除） | `src/app/(dashboard)/bookmarks/actions.ts` |
| `createTag(name)` | タグ新規作成 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `updateTag(id, name)` | タグ名の更新 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `reorderTags(ids, options?)` | タグの並び順更新 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `deleteTag(id)` | タグ削除 | `src/app/(dashboard)/bookmarks/actions.ts` |
| `fetchOgp(url)` | URL から OGP 情報とファビコン URL を取得 | `src/app/(dashboard)/bookmarks/fetchOgp.ts` |
| `generateApiKey()` | API キーの生成・再生成 | `src/app/(dashboard)/api-key-actions.ts` |
| `revokeApiKey()` | API キーの失効（無効化） | `src/app/(dashboard)/api-key-actions.ts` |

---

## 共通仕様

- Server Action は原則として先頭で `getSession()` を呼び出して認証チェックをする
- 未認証時は `/sign-in` へ redirect する
- ただし `fetchOgp(url)`（`bookmarks/fetchOgp.ts`）はユーザーデータを操作しない外部フェッチのため、この認証チェックの対象外とする
- 戻り値は少なくとも `error?: string` を含む型にする
- DB 変更後は `revalidatePath()` でキャッシュを更新する（`skipRevalidate` オプションが有効な場合を除く）
- `src/lib/` の関数が返す `{ error }` はそのまま返す。予期しないエラーは再 throw する
  - 例外: `createTag` / `updateTag` は予期しない例外（DB 障害等）を捕捉し、`{ error: "タグの作成に失敗しました" }` / `{ error: "タグの更新に失敗しました" }` を返す。タグ管理モーダルにこの文言を表示するため（本番では Server Action の例外メッセージが汎用文言に置き換わる）
