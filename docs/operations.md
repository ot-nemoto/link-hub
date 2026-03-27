# 運用手順

## リリースフロー

```
feature/* ブランチ
    ↓ PR（feature/* → develop）
develop ブランチ  ← CI 自動実行（lint・unit test）
    ↓ PR（develop → master）に bump:patch または bump:minor ラベルを貼る
    ↓ Actions が自動で package.json をバンプして commit
master ブランチ
    ↓ マージ
release.yml が自動実行 → GitHub Release 作成（タグ: vX.X.X）
```

### 手順詳細

1. `feature/*` ブランチで実装・テストを完了させる
2. `develop` への PR を作成 → CI（lint・unit test）が自動実行
3. CI 通過・レビュー後に `develop` へマージ
4. `develop` → `master` の PR を作成
5. PR に `bump:patch` または `bump:minor` ラベルを貼る
6. `bump-version.yml` が自動で `package.json` をバンプして PR ブランチに commit
7. `master` へマージ → `release.yml` が GitHub Release を自動作成

---

## バージョニングルール

セマンティックバージョニング（SemVer）に従う。バージョンは `master` マージ前にラベルで指定する。

| ラベル | バージョン操作 | 例 | 使用場面 |
|--------|-------------|-----|---------|
| `bump:minor` | マイナー +1、パッチ → 0 | `0.1.0` → `0.2.0` | 新機能追加、フェーズ完了 |
| `bump:patch` | パッチ +1 | `0.2.0` → `0.2.1` | バグ修正、小改善、Dependabot マージ |
| （手動） | メジャー +1 | `0.x.x` → `1.0.0` | 破壊的変更（ユーザーの明示的な指示のみ） |

- `1.0.0` は本番リリース（MVP 完成）など、ユーザーが指定したタイミングで上げる
- ラベルを貼ると Actions が commit メッセージ `chore: bump version to x.x.x` で自動 push する

---

## CI の構成と確認観点

### ci.yml

| 項目 | 内容 |
|------|------|
| トリガー | `develop` または `master` への PR 作成・更新時 |
| 実行内容 | `npm ci` → `prisma generate` → `npm run lint` → `npm run test` |
| 確認観点 | PR マージ前に lint エラーおよびユニットテスト失敗がないことを確認 |

### bump-version.yml

| 項目 | 内容 |
|------|------|
| トリガー | `master` への PR に `bump:patch` または `bump:minor` ラベルが付いたとき |
| 実行内容 | `npm version patch/minor` → `package.json` / `package-lock.json` を commit・push |
| 注意 | ラベルは1つのみ貼る（両方貼ると二重実行される） |

### release.yml

| 項目 | 内容 |
|------|------|
| トリガー | `master` ブランチへの push |
| 実行内容 | `package.json` のバージョンでタグ作成 → GitHub Release 自動生成 |
| 注意 | 同バージョンのタグが既に存在する場合はスキップされる |

---

## Dependabot 対応フロー

Dependabot は毎週月曜日に `develop` へ PR を作成する（npm パッケージを production/development グループでまとめて）。

### 対応方針

| 種別 | 対応 |
|------|------|
| セキュリティ修正（security advisory あり） | 優先対応。内容確認後、速やかにマージ |
| patch バージョン | CI 通過を確認してマージ |
| minor バージョン | CI 通過 + 簡単な動作確認後にマージ |
| major バージョン | Breaking changes を確認し、慎重に対応 |

### 手順

1. Dependabot PR の CI が通過していることを確認
2. 変更内容（changelog / release notes）を確認
3. `develop` へマージ
4. `develop` → `master` の PR に `bump:patch` ラベルを貼る（通常は patch 扱い）
5. 自動バンプ後、`master` へマージ
