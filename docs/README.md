# docs ポータル

link-hub プロジェクトのドキュメント一覧です。

---

## ドキュメント一覧

| ファイル | 役割 |
|---------|------|
| [product.md](./product.md) | プロダクトの目的・対象ユーザー・ゴール・非ゴール |
| [requirements.md](./requirements.md) | 機能要件・非機能要件・画面一覧 |
| [architecture.md](./architecture.md) | 技術スタック・ディレクトリ構成・実装方針・デプロイフロー・環境変数 |
| [schema.md](./schema.md) | DB テーブル定義・Prisma スキーマ・リレーション図・インデックス |
| [api.md](./api.md) | Server Actions 仕様・REST API 定義 |
| [ui.md](./ui.md) | 画面一覧・画面遷移図・コンポーネント一覧・UI 規約 |
| [tasks.md](./tasks.md) | フェーズ構成・マイルストーンリンク（タスク詳細は GitHub Issues で管理） |
| [testing.md](./testing.md) | テスト方針・カバレッジ観点・実行手順 |
| [manual-testing.md](./manual-testing.md) | 手動テスト観点チェックリスト |

---

## 読む順番（新規参加者向け）

1. **[product.md](./product.md)** — 何を作っているかを把握する
2. **[architecture.md](./architecture.md)** — 技術スタックと実装方針を確認する
3. **[requirements.md](./requirements.md)** — 機能要件の全体像を把握する
4. **[schema.md](./schema.md)** — DB 設計を確認する
5. **[api.md](./api.md)** — Server Actions の仕様を確認する
6. **[ui.md](./ui.md)** — 画面構成とコンポーネント設計を確認する
7. **[tasks.md](./tasks.md)** — 現在の進捗と次のタスクを確認する

---

## 更新ルール

- 仕様変更が発生した場合、コード修正と同時に該当ドキュメントを更新する
- ドキュメントとコードが乖離した場合は、原則ドキュメントを正として扱いコードを修正する
- 詳細は [CLAUDE.md](../CLAUDE.md) の「ドキュメント更新ルール」を参照
