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
| 上記以外すべて | 認証必須（未認証は Clerk のサインイン画面へリダイレクト） |

### 開発環境のモックバイパス

`.env.local` に `MOCK_USER_ID` または `MOCK_USER_EMAIL` が設定されている場合、middleware の認証チェックをスキップする（本番環境では無効）。

---

## セッション管理

`src/lib/auth.ts` の `getSession()` を使用する。

```ts
getSession(): Promise<Session | null>

type Session = {
  user: {
    id: string;       // DB の User.id（CUID）
    name: string | null;
    email: string;
  };
};
```

### 処理フロー

1. 開発環境かつ `MOCK_USER_ID` / `MOCK_USER_EMAIL` が設定されている場合、DB から直接ユーザーを返す
2. Clerk の `auth()` で `userId`（Clerk ID）を取得。未認証なら `null` を返す
3. DB に `clerkId` が一致するユーザーが存在すれば返す
4. 存在しない場合、Clerk からメールアドレスを取得して DB に upsert してから返す

### 利用パターン

```ts
// Server Action での典型的な使い方
const session = await getSession();
if (!session) redirect("/sign-in");
// session.user.id で自ユーザーを特定
```

---

## ユーザーデータ分離

認証はロールなしのユーザー認証。各ユーザーは自分のデータのみにアクセスできる。DB アクセスでは `where` に `userId` を含めるか、取得後に所有者の `userId` を検証する。
