/**
 * OpenAPI `info.description` に載せる散文（Markdown）。
 * API の人間向けドキュメントは配信 spec に一本化するため、概要・認証・共通仕様・
 * エラー方針・クイックスタートはここに集約する（別途 API ドキュメントは持たない）。
 * Markdown ファイル読み込みではなく TS 定数にしているのは、ビルド / Vercel 実行時に
 * ファイル同梱を気にせず確実に spec へ含めるため。
 */
export const API_DESCRIPTION = `link-hub の外部 REST API。API キーがあれば UI を介さずブックマーク・タグを操作できる。

> **破壊的変更**: ブックマークレスポンスのタグ情報フィールドは \`category\` から \`tag\` にリネームされた（本 API はバージョニングされていない）。

## 認証

- \`Authorization: Bearer <api-key>\` ヘッダー必須
- API キーはアプリの設定モーダルで発行・再生成・失効できる（1 ユーザー 1 キー。再生成すると旧キーは即時無効）
- 書式は \`lh_\` + base64url（43 文字）。キーはハッシュ化して保存されるため、生値は発行直後の一度しか表示されない
- キーが無効・未指定の場合は \`401 Unauthorized\`

## 共通仕様

- リクエスト・レスポンスボディはすべて JSON（\`Content-Type: application/json\`）
- 削除はソフトデリート（ゴミ箱へ移動）。ゴミ箱の一覧・復元・完全削除を別途提供する
- 未知のリクエストフィールドは受理して無視する（strip）
- **CORS**: 任意オリジンから利用できる（\`Access-Control-Allow-Origin: *\`）。API キー認証で Cookie を使わないためオリジン制限は不要。プリフライト \`OPTIONS\` にも対応する

## エラーレスポンス

エラー時は \`{ "error": "<メッセージ>" }\` を返す。下表はステータスと意味の対応（全エンドポイント共通）で、各オペレーションが実際に返し得るステータスはそれぞれの Responses を参照。

| ステータス | 条件 |
|-----------|------|
| 400 | バリデーションエラー（\`url\` / \`title\` 不正、\`tagId\` / \`sortOrder\` の型・範囲、\`ids\` 不正、ボディ不正 等） |
| 401 | API キーが未指定・無効 |
| 403 | 他ユーザーのリソースを操作しようとした |
| 404 | 対象リソースが存在しない（ブックマーク／指定した \`tagId\` のタグ 等） |
| 409 | 同名タグが既に存在する |

## クイックスタート

\`\`\`bash
export LH_API_KEY="<設定モーダルで発行したキー>"
export BASE="<本リファレンス上部の API Base URL>"

# 一覧取得
curl -s -H "Authorization: Bearer \${LH_API_KEY}" "$BASE/api/bookmarks" | jq

# 作成
curl -s -X POST -H "Authorization: Bearer \${LH_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","title":"Example"}' \\
  "$BASE/api/bookmarks" | jq
\`\`\`

各エンドポイントのリクエスト / レスポンスの詳細は、本リファレンスの各オペレーションを参照（コードサンプルも生成される）。
`;
