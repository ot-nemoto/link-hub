# 認証・認可

## 認証方式

Clerk によるメール/パスワード認証を使用する。

- サインイン: `/sign-in`
- サインアップ: `/sign-up`
- エラーページ: `/auth-error`

---

## 保護対象ルート

`src/proxy.ts`（Next.js 16 の middleware）で制御する。

| ルート | アクセス |
|--------|---------|
| `/sign-in/**` | 公開（認証不要） |
| `/sign-up/**` | 公開（認証不要） |
| `/auth-error` | 公開（認証不要） |
| `/api/bookmarks/**` | 公開（Clerk 認証は不要。API キー認証で保護。[`docs/api.md`](api.md) 参照） |
| `/api/tags/**` | 公開（Clerk 認証は不要。API キー認証で保護。[`docs/api.md`](api.md) 参照） |
| 上記以外すべて | 認証必須（未認証は Clerk のサインイン画面へリダイレクト） |

### 開発環境のモックバイパス

`.env` に `MOCK_USER_ID` または `MOCK_USER_EMAIL` が設定されている場合、middleware の認証チェックをスキップする（本番環境では無効）。

---

## セッション管理

`src/lib/auth.ts` の `getSession()` を使う（戻り値 `Session` の型定義はコードを正とする）。返すのは DB の `User.id`（CUID）・`name`・`email` を含むユーザー情報、未認証時は `null`。

### 処理フロー

1. 開発環境かつ `MOCK_USER_ID` / `MOCK_USER_EMAIL` が設定されている場合、DB から直接ユーザーを返す
2. Clerk の `auth()` で `userId`（Clerk ID）を取得。未認証なら `null` を返す
3. DB に `clerkId` が一致するユーザーが存在すれば返す
4. 存在しない場合、Clerk からメールアドレスを取得して DB に upsert してから返す

### 利用パターン

- Server Action / Server Component の先頭で `getSession()` を呼び、未認証なら `redirect("/sign-in")` する。以降は `session.user.id` で自ユーザーを特定する

---

## ユーザーデータ分離

認証はロールなしのユーザー認証で、各ユーザーは自分のデータのみアクセスできる。DB アクセスの `where` に `userId` を含める等の具体ルールは [`CLAUDE.md` のセキュリティルール](../CLAUDE.md#セキュリティルール) を正とする。
