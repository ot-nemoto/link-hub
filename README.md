# link-hub

![CI](https://github.com/ot-nemoto/link-hub/actions/workflows/ci.yml/badge.svg)
![Version](https://img.shields.io/github/package-json/v/ot-nemoto/link-hub)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

アカウントごとにブックマークを管理するシンプルな Web アプリケーションです。

## 機能

- ブックマークの登録・編集・削除（URL・タイトル・メモ・カテゴリ・OGP画像）
- カテゴリによるグルーピング表示（同一ドメインのサブグループ表示・開閉状態の保持）
- キーワード検索
- ドラッグ＆ドロップによる並び替え（ブックマーク・カテゴリ）
- ゴミ箱方式の削除（復元・完全削除）
- API キー認証による外部 REST API（ブックマーク・カテゴリの CRUD／並び替え／ゴミ箱／OGP 取得）
- 完全なユーザーデータ分離（他ユーザーのデータは参照不可）

## ドキュメント

| ファイル | 役割 |
|---------|------|
| [docs/product.md](./docs/product.md) | プロダクトの目的・対象ユーザー・ゴール・成功指標 |
| [docs/architecture.md](./docs/architecture.md) | 技術スタック・実装方針・環境変数 |
| [docs/schema.md](./docs/schema.md) | DB テーブル定義・リレーション図 |
| [docs/api.md](./docs/api.md) | 外部 REST API の概要・認証（詳細な仕様は下記リファレンス） |
| API リファレンス（Stoplight Elements）: アプリ内 `/api-reference`（ログイン必須） | Zod スキーマから生成した OpenAPI 3.1 仕様をアプリ内でホスティング |
| [docs/actions.md](./docs/actions.md) | Server Actions 一覧 |
| [docs/auth.md](./docs/auth.md) | 認証フロー・保護対象ルート・セッション管理 |
| [docs/ui.md](./docs/ui.md) | 画面一覧・画面遷移図・UI 規約 |
| [docs/development.md](./docs/development.md) | ローカルセットアップ・環境変数・DB操作・デプロイ手順 |

> 個別のタスク・進捗は GitHub Issues / Milestone で管理する。

## クイックスタート

```bash
npm install
npm run dev
```

詳細なセットアップ手順は [docs/development.md](./docs/development.md) を参照してください。
