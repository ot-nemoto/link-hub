# UI

## 画面一覧

| 画面名 | パス | 認証 | 説明 |
|--------|------|------|------|
| トップ | `/` | 不要 | ログイン画面へリダイレクト |
| ログイン | `/sign-in` | 不要 | Clerk が提供するログイン画面 |
| サインアップ | `/sign-up` | 不要 | Clerk が提供するサインアップ画面 |
| ブックマーク一覧 | `/bookmarks` | 必要 | 自分のブックマーク一覧。新規登録ボタンあり |
| ブックマーク新規登録 | `/bookmarks/new` | 必要 | URL・タイトル・メモを入力して登録 |
| ブックマーク編集 | `/bookmarks/[id]/edit` | 必要 | 既存ブックマークの編集 |
| 認証エラー | `/auth-error` | 不要 | 認証失敗時のエラー表示 |

## 画面遷移図

```mermaid
flowchart TD
    classDef screen fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    classDef nav fill:#fef9c3,stroke:#ca8a04,color:#713f12

    UNAUTH([未認証アクセス])
    LOGIN[ログイン]:::screen
    AUTH_ERROR[認証エラー]:::screen
    LIST[ブックマーク一覧]:::screen
    NEW[ブックマーク新規登録]:::screen
    EDIT[ブックマーク編集]:::screen

    UNAUTH -->|Clerk Middleware| LOGIN
    LOGIN -->|ログイン成功| LIST
    LOGIN -->|エラー| AUTH_ERROR
    AUTH_ERROR -->|サインアウト| LOGIN

    LIST -->|新規登録ボタン| NEW
    LIST -->|編集ボタン| EDIT

    NEW -->|保存成功| LIST
    NEW -->|キャンセル| LIST

    EDIT -->|保存成功| LIST
    EDIT -->|キャンセル| LIST

    subgraph Header ["Header（全画面共通）"]
        direction LR
        H_LIST(ブックマーク一覧):::nav
        H_LOGOUT(ログアウト):::nav
    end

    H_LIST --> LIST
    H_LOGOUT -->|Clerk サインアウト| LOGIN
```

## 画面機能仕様

### ブックマーク一覧（`/bookmarks`）

- ログインユーザーのブックマークを sortOrder 順（昇順）で全件表示する
- ブックマークが 0 件の場合は「まだブックマークがありません」を表示
- 各ブックマークに編集ボタン・削除ボタンを表示
- 削除ボタンをクリックすると即座に UI から非表示になり（楽観的更新）、5 秒後に DB から削除確定する（確認ダイアログは表示しない）
- 5 秒以内に Undo した場合は削除を取り消す
- ヘッダーに「新規登録」ボタンを表示
- リスト表示のみ（カード表示廃止）
- リスト行に OGP サムネイル（og_image）を表示する
- キーワード検索（title / url / memo に対する部分一致）
- 検索ワード入力中はドラッグ＆ドロップを無効化し、行の背景を薄青（`bg-blue-50` / `dark:bg-blue-950`）にしてドラッグハンドルを非表示にする
- ドラッグ＆ドロップで並び順を変更できる（ドラッグハンドルをクリックしてドラッグ）
- 並び替え後は `PATCH /api/bookmarks/reorder` で DB に保存する
- チェックボックスで複数選択し一括削除可能
- ダークモード対応（OS 設定に従い初期化、ローカルストレージで保持）

### ブックマーク新規登録（`/bookmarks/new`）

- URL（必須）・タイトル（必須）・メモ（任意）を入力
- URL 入力時に OGP を自動取得し、タイトル・OGP 画像 URL を補完する
- クライアント側でバリデーションを実行（空チェック・URL 形式・http/https スキーム）
- 保存後は一覧画面へリダイレクト
- キャンセルボタンで一覧画面へ戻る

### ブックマーク編集（`/bookmarks/[id]/edit`）

- 既存の URL・タイトル・メモを初期値として表示
- バリデーションは新規登録と同様
- 保存後は一覧画面へリダイレクト
- キャンセルボタンで一覧画面へ戻る

## 各画面の表示状態

### ブックマーク一覧（`/bookmarks`）

| 状態 | 条件 | 表示内容 |
|------|------|---------|
| Normal | ブックマークが 1 件以上、検索なし | ブックマークリストを表示（D&D 有効） |
| Searching | 検索ワード入力中 | ブックマークリストを表示（D&D 無効、行背景薄青） |
| Empty | ブックマークが 0 件 | 「まだブックマークがありません」のメッセージを表示 |
| EmptySearch | 検索結果が 0 件 | 「該当するブックマークがありません」のメッセージを表示 |
| Error | Server Action 失敗（削除エラーなど） | 削除ボタン直上にエラーメッセージ（`bg-red-50 text-red-600`）を表示 |

### ブックマーク新規登録 / 編集（`/bookmarks/new`, `/bookmarks/[id]/edit`）

| 状態 | 条件 | 表示内容 |
|------|------|---------|
| Normal | 初期表示 | 空フォーム（編集時は既存値で初期化） |
| FetchingOgp | OGP取得中 | タイトルラベルに「取得中...」を表示し、保存ボタンを `disabled` |
| Submitting | フォーム送信中 | 保存ボタンを「保存中...」に変更し `disabled` |
| ValidationError | クライアントバリデーション失敗 | 各フィールド下にエラーメッセージを表示（`text-red-500`） |
| Error | Server Action 失敗 | フォーム上部にエラーメッセージを表示（`bg-red-50 text-red-600`） |

---

## レイアウト構成

```
src/app/
├── layout.tsx              # ルートレイアウト（ClerkProvider）
├── (auth)/                 # 認証画面グループ（ヘッダーなし）
│   ├── sign-in/            # Clerk ログイン画面
│   └── sign-up/            # Clerk サインアップ画面
├── (dashboard)/            # 認証済み画面グループ
│   ├── layout.tsx          # ダッシュボードレイアウト（ヘッダー含む）
│   ├── LogoutButton.tsx    # ログアウトボタン（Clerk useClerk フック使用）
│   └── bookmarks/          # ブックマーク関連画面
│       ├── page.tsx        # 一覧
│       ├── new/page.tsx    # 新規登録
│       ├── [id]/edit/page.tsx  # 編集
│       ├── BookmarkForm.tsx    # 登録・編集共通フォーム（OGP 自動取得含む）
│       ├── BookmarkList.tsx    # ブックマーク一覧（DnD リスト・OGP・選択・削除）
│       ├── DeleteButton.tsx    # 削除ボタン（楽観的更新・Undo連携）
│       ├── ThemeToggle.tsx     # ダークモード切り替えボタン
│       ├── UndoSnackbar.tsx    # 削除 Undo スナックバー
│       ├── actions.ts      # Server Actions（CRUD・一括削除）
│       └── fetchOgp.ts     # OGP 取得 Server Action
└── auth-error/page.tsx     # 認証エラー画面
```

## コンポーネント一覧

| コンポーネント | ファイル | 種別 | 説明 |
|--------------|---------|------|------|
| `BookmarkForm` | `bookmarks/BookmarkForm.tsx` | Client Component | ブックマーク登録・編集フォーム。バリデーション・送信処理・OGP 自動取得を担当 |
| `BookmarkList` | `bookmarks/BookmarkList.tsx` | Client Component | ブックマーク一覧。DnD リスト表示・OGP サムネイル・チェックボックス選択・削除操作を担当 |
| `DeleteButton` | `bookmarks/DeleteButton.tsx` | Client Component | 削除ボタン。楽観的更新・Undo スナックバー連携を担当 |
| `LogoutButton` | `LogoutButton.tsx` | Client Component | ログアウトボタン。Clerk 7 + React 19 対応のため `useClerk` フックで実装 |
| `ThemeToggle` | `bookmarks/ThemeToggle.tsx` | Client Component | ダークモード切り替えボタン |
| `UndoSnackbar` | `bookmarks/UndoSnackbar.tsx` | Client Component | 削除後 5 秒間表示する Undo スナックバー |

## UI 規約

- スタイリング: Tailwind CSS 4
- カラー: blue-600 をプライマリカラーとして使用
- フォーム要素: `rounded border border-gray-300` で統一
- エラー表示: `text-red-500`（フィールド）/ `bg-red-50 text-red-600`（フォーム全体）
- ボタン:
  - 主操作: `bg-blue-600 text-white hover:bg-blue-700`
  - 副操作: `border border-gray-300 text-gray-600 hover:bg-gray-100`
- レスポンシブ: 未対応（MVP スコープ外）
