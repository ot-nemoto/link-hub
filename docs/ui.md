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

- ログインユーザーのブックマークを指定ソート順で表示（デフォルト: 登録日時降順）
- ブックマークが 0 件の場合は「まだブックマークがありません」を表示
- 各ブックマークに編集ボタン・削除ボタンを表示
- 削除ボタンをクリックすると即座に UI から非表示になり（楽観的更新）、5 秒後に DB から削除確定する（確認ダイアログは表示しない）
- 5 秒以内に Undo した場合は削除を取り消す
- ヘッダーに「新規登録」ボタンを表示
- カード表示 / リスト表示を切り替え可能（ローカルストレージで保持）
- カード表示時は OGP 画像を表示する
- キーワード検索（title / url / memo に対する部分一致）
- ソート切り替え（作成日時・タイトル × 昇順/降順）
- 表示件数変更（5 / 10 / 20 / 50 / 100 件、デフォルト 20 件）
- ページネーション（前へ / 次へ）
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
| Normal | ブックマークが 1 件以上 | ブックマークカードの一覧を表示 |
| Empty | ブックマークが 0 件 | 「まだブックマークがありません」のメッセージを表示 |
| Error | Server Action 失敗（削除エラーなど） | 削除ボタン直上にエラーメッセージ（`bg-red-50 text-red-600`）を表示 |

### ブックマーク新規登録 / 編集（`/bookmarks/new`, `/bookmarks/[id]/edit`）

| 状態 | 条件 | 表示内容 |
|------|------|---------|
| Normal | 初期表示 | 空フォーム（編集時は既存値で初期化） |
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
│   └── bookmarks/          # ブックマーク関連画面
│       ├── page.tsx        # 一覧
│       ├── new/page.tsx    # 新規登録
│       ├── [id]/edit/page.tsx  # 編集
│       ├── BookmarkForm.tsx    # 登録・編集共通フォーム（OGP 自動取得含む）
│       ├── BookmarkList.tsx    # ブックマーク一覧（カード/リスト・選択・削除）
│       ├── LimitSelect.tsx     # 表示件数セレクト
│       ├── SortSelect.tsx      # ソート順セレクト
│       ├── ViewToggle.tsx      # カード/リスト切り替えボタン
│       ├── ThemeToggle.tsx     # ダークモード切り替えボタン
│       ├── UndoSnackbar.tsx    # 削除 Undo スナックバー
│       ├── actions.ts      # Server Actions（CRUD・一括削除）
│       ├── fetchOgp.ts     # OGP 取得 Server Action
│       └── constants.ts    # ソート・表示件数などの定数
└── auth-error/page.tsx     # 認証エラー画面
```

## コンポーネント一覧

| コンポーネント | ファイル | 種別 | 説明 |
|--------------|---------|------|------|
| `BookmarkForm` | `bookmarks/BookmarkForm.tsx` | Client Component | ブックマーク登録・編集フォーム。バリデーション・送信処理・OGP 自動取得を担当 |
| `BookmarkList` | `bookmarks/BookmarkList.tsx` | Client Component | ブックマーク一覧。カード/リスト表示切り替え・チェックボックス選択・削除操作を担当 |
| `LimitSelect` | `bookmarks/LimitSelect.tsx` | Client Component | 表示件数セレクト（5 / 10 / 20 / 50 / 100 件） |
| `SortSelect` | `bookmarks/SortSelect.tsx` | Client Component | ソート順セレクト（作成日時・タイトル × 昇順/降順） |
| `ViewToggle` | `bookmarks/ViewToggle.tsx` | Client Component | カード / リスト表示切り替えボタン |
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
