# 認証・認可

## 認証方式

Clerk によるメール/パスワード認証を使用する。

- サインイン: `/sign-in`
- サインアップ: `/sign-up`
- エラーページ: `/auth-error`

### 外部 REST API の API キー認証

外部 REST API（`/api/bookmarks/**` 等）は Clerk ではなく `Authorization: Bearer <api-key>` で認証する。

- **書式**: `lh_` + base64url(32 bytes)。prefix はキー種別・発行元の識別と、自前スキャナ（gitleaks 等）でのルール化のため（GitHub secret scanning の検出対象にはならない）
- **保存**: DB には SHA-256（hex）のみ保存し、平文は保存しない。生値は発行・再生成の直後に一度だけ返す（show-once）
- **ソルト無しの理由**: キーは高エントロピー乱数で辞書攻撃が成立しない。ソルト付き（bcrypt / argon2 等）にすると `where` で一意に引けず全件照合になるため使わない
- **照合**: 受け取ったキーをハッシュ化し、`apiKeyHash` の UNIQUE インデックスで引く（DB の等価比較のため timing-safe 比較は不要）
- **ハッシュ実装**: Web Crypto（`crypto.subtle.digest`）を使い Edge / Node 両対応。マイグレーションの SQL（`encode(sha256(convert_to(..., 'UTF8')), 'hex')`）と同じ値になる
- 1 ユーザー 1 キー。再生成で旧キーは即時無効、失効で未発行に戻る。有効期限は持たず、`apiKeyLastUsedAt` での棚卸しで代替する。`apiKeyLastUsedAt` は 1 時間に 1 回まで更新し、更新失敗で認証済みリクエストを落とさない（付随情報のため握りつぶして次回に委ねる）

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
| `/api/ogp/**` | 公開（Clerk 認証は不要。API キー認証で保護。[`docs/api.md`](api.md) 参照） |
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
