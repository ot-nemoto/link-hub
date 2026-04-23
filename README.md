# link-hub

![CI](https://github.com/ot-nemoto/link-hub/actions/workflows/ci.yml/badge.svg)
![Version](https://img.shields.io/github/package-json/v/ot-nemoto/link-hub)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

アカウントごとにブックマークを管理するシンプルな Web アプリケーションです。
<!-- ci-check -->

## 機能

- ブックマークの登録・編集・削除（URL・タイトル・メモ・OGP画像）
- タグによる分類とフィルタリング
- キーワード検索
- ドラッグ＆ドロップによる並び替え
- ダークモード対応
- 完全なユーザーデータ分離（他ユーザーのデータは参照不可）

## ドキュメント

| ファイル | 役割 |
|---------|------|
| [docs/product.md](./docs/product.md) | プロダクトの目的・対象ユーザー・ゴール |
| [docs/requirements.md](./docs/requirements.md) | 機能要件・非機能要件・画面一覧 |
| [docs/architecture.md](./docs/architecture.md) | 技術スタック・ディレクトリ構成・実装方針・環境変数 |
| [docs/schema.md](./docs/schema.md) | DB テーブル定義・Prisma スキーマ・リレーション図 |
| [docs/api.md](./docs/api.md) | 外部 REST API 定義 |
| [docs/actions.md](./docs/actions.md) | Server Actions 仕様（引数・戻り値・エラー） |
| [docs/auth.md](./docs/auth.md) | 認証フロー・保護対象ルート・セッション管理 |
| [docs/ui.md](./docs/ui.md) | 画面一覧・画面遷移図・コンポーネント一覧・UI 規約 |
| [docs/tasks.md](./docs/tasks.md) | フェーズ構成・マイルストーンリンク |
| [docs/testing.md](./docs/testing.md) | テスト方針・完了条件・実行手順 |
| [docs/e2e-scenarios.md](./docs/e2e-scenarios.md) | E2E テストシナリオ一覧 |
| [docs/development.md](./docs/development.md) | ローカルセットアップ・環境変数・DB操作・デプロイ手順 |
| [docs/operations.md](./docs/operations.md) | リリースフロー・バージョニングルール・CI 構成 |

## クイックスタート

```bash
npm install
npm run dev
```

詳細なセットアップ手順は [docs/development.md](./docs/development.md) を参照してください。
