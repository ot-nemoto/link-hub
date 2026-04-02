# link-hub

アカウントごとにブックマークを管理するシンプルな Web アプリケーションです。

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
| [docs/api.md](./docs/api.md) | Server Actions 仕様・REST API 定義 |
| [docs/ui.md](./docs/ui.md) | 画面一覧・画面遷移図・コンポーネント一覧・UI 規約 |
| [docs/tasks.md](./docs/tasks.md) | フェーズ構成・マイルストーンリンク |
| [docs/testing.md](./docs/testing.md) | テスト方針・完了条件・実行手順 |
| [docs/manual-testing.md](./docs/manual-testing.md) | 手動テスト観点チェックリスト |
| [docs/development.md](./docs/development.md) | ローカルセットアップ・環境変数・DB操作・デプロイ手順 |
| [docs/operations.md](./docs/operations.md) | リリースフロー・バージョニングルール・CI 構成 |

## クイックスタート

```bash
npm install
npm run dev
```

詳細なセットアップ手順は [docs/development.md](./docs/development.md) を参照してください。
