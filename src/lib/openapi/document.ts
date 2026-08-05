import { z } from "zod";

import { bookmarkBodySchema, bookmarkResponseSchema } from "@/lib/schemas/bookmark";
import { errorResponseSchema, reorderBodySchema } from "@/lib/schemas/common";
import { ogpResponseSchema } from "@/lib/schemas/ogp";
import { tagBodySchema, tagResponseSchema } from "@/lib/schemas/tag";

/**
 * `additionalProperties` を再帰的に除去する。
 * Zod の `z.object()` は既定で strip（未知キーは受理して無視）だが `z.toJSONSchema()` は
 * `additionalProperties: false` を出力するため、これを残すと「未知フィールドは拒否」と読めて
 * 実サーバー挙動（受理して無視）と食い違う。仕様を実挙動に合わせるため除去する。
 */
function stripAdditionalProperties(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) stripAdditionalProperties(item);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    delete obj.additionalProperties;
    for (const value of Object.values(obj)) stripAdditionalProperties(value);
  }
}

/** Zod スキーマを OpenAPI 3.1（JSON Schema 2020-12）に変換する。`$schema`・`additionalProperties` は除去。 */
function toSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  stripAdditionalProperties(json);
  return json;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** JSON レスポンス定義。 */
const jsonResponse = (description: string, schema: object) => ({
  description,
  content: { "application/json": { schema } },
});

/** `{ error }` を返す 4xx レスポンス定義。 */
const errorResponse = (description: string) => jsonResponse(description, ref("Error"));

/** JSON リクエストボディ定義。 */
const jsonBody = (name: string) => ({
  required: true,
  content: { "application/json": { schema: ref(name) } },
});

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "対象リソースの ID",
};

/** OpenAPI 3.1 ドキュメントを組み立てる。`serverUrl`（アクセス元オリジン）があれば servers 先頭に置く。 */
export function buildOpenApiDocument(options: { version?: string; serverUrl?: string } = {}) {
  const localhost = "http://localhost:3000";
  // アクセス元オリジンが localhost（ポート違い含む）なら、固定の localhost 候補は紛らわしいので加えない。
  const originIsLocalhost = options.serverUrl
    ? new URL(options.serverUrl).hostname === "localhost"
    : false;
  const servers = [
    ...(options.serverUrl ? [{ url: options.serverUrl }] : []),
    ...(originIsLocalhost ? [] : [{ url: localhost, description: "ローカル開発" }]),
  ];
  return {
    openapi: "3.1.0",
    info: {
      title: "link-hub API",
      version: options.version ?? "0.0.0",
      description:
        "link-hub の外部 REST API。API キー（`Authorization: Bearer <api-key>`）で認証する。\n\n" +
        "**破壊的変更**: ブックマークレスポンスのタグ情報フィールドは `category` から `tag` にリネームされた（本 API はバージョニングされていない）。",
    },
    servers,
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "設定モーダルで発行した API キー",
        },
      },
      schemas: {
        Error: toSchema(errorResponseSchema),
        BookmarkBody: toSchema(bookmarkBodySchema),
        Bookmark: toSchema(bookmarkResponseSchema),
        ReorderBody: toSchema(reorderBodySchema),
        TagBody: toSchema(tagBodySchema),
        Tag: toSchema(tagResponseSchema),
        Ogp: toSchema(ogpResponseSchema),
      },
    },
    paths: {
      "/api/bookmarks": {
        get: {
          summary: "ブックマーク一覧を取得",
          tags: ["bookmarks"],
          responses: {
            200: jsonResponse("未削除ブックマークの一覧", {
              type: "object",
              properties: { bookmarks: { type: "array", items: ref("Bookmark") } },
              required: ["bookmarks"],
            }),
            401: errorResponse("認証エラー"),
          },
        },
        post: {
          summary: "ブックマークを作成",
          tags: ["bookmarks"],
          requestBody: jsonBody("BookmarkBody"),
          responses: {
            201: jsonResponse("作成されたブックマーク", ref("Bookmark")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            404: errorResponse("指定した tagId のタグが存在しない"),
          },
        },
        delete: {
          summary: "複数ブックマークを一括削除（ゴミ箱へ）",
          tags: ["bookmarks"],
          parameters: [
            {
              name: "ids",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "カンマ区切りの ID",
            },
          ],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            400: errorResponse("ids 未指定"),
            401: errorResponse("認証エラー"),
          },
        },
      },
      "/api/bookmarks/reorder": {
        post: {
          summary: "ブックマークの並び順を一括更新",
          tags: ["bookmarks"],
          requestBody: jsonBody("ReorderBody"),
          responses: {
            200: { description: "並び替え成功（ボディなし）" },
            400: errorResponse("ids 不正"),
            401: errorResponse("認証エラー"),
            403: errorResponse("他ユーザーの ID を含む"),
          },
        },
      },
      "/api/bookmarks/trash": {
        get: {
          summary: "ゴミ箱（削除済み）一覧を取得",
          tags: ["bookmarks"],
          responses: {
            200: jsonResponse("削除済みブックマークの一覧", {
              type: "object",
              properties: { bookmarks: { type: "array", items: ref("Bookmark") } },
              required: ["bookmarks"],
            }),
            401: errorResponse("認証エラー"),
          },
        },
        delete: {
          summary: "ゴミ箱を空にする（完全削除）",
          tags: ["bookmarks"],
          responses: {
            204: { description: "完全削除成功（ボディなし）" },
            401: errorResponse("認証エラー"),
          },
        },
      },
      "/api/bookmarks/{id}": {
        patch: {
          summary: "ブックマークを更新（タグ移動・並び順変更を含む）",
          tags: ["bookmarks"],
          parameters: [idParam],
          requestBody: jsonBody("BookmarkBody"),
          responses: {
            200: jsonResponse("更新後のブックマーク", ref("Bookmark")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("他ユーザーのリソース"),
            404: errorResponse("未存在 / 指定した tagId のタグが存在しない"),
          },
        },
        delete: {
          summary: "ブックマークを削除（ゴミ箱へ）",
          tags: ["bookmarks"],
          parameters: [idParam],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            401: errorResponse("認証エラー"),
            403: errorResponse("他ユーザーのリソース"),
            404: errorResponse("未存在"),
          },
        },
      },
      "/api/bookmarks/{id}/restore": {
        post: {
          summary: "ゴミ箱から復元",
          tags: ["bookmarks"],
          parameters: [idParam],
          responses: {
            200: jsonResponse("復元後のブックマーク", ref("Bookmark")),
            401: errorResponse("認証エラー"),
            403: errorResponse("他ユーザーのリソース"),
            404: errorResponse("未存在"),
          },
        },
      },
      "/api/tags": {
        get: {
          summary: "タグ一覧を取得",
          tags: ["tags"],
          parameters: [
            {
              name: "withCount",
              in: "query",
              required: false,
              schema: { type: "string" },
              description:
                "`true` のとき各タグの未削除ブックマーク件数を含める（それ以外の値は件数なし）",
            },
          ],
          responses: {
            200: jsonResponse("タグの一覧", {
              type: "object",
              properties: { tags: { type: "array", items: ref("Tag") } },
              required: ["tags"],
            }),
            401: errorResponse("認証エラー"),
          },
        },
        post: {
          summary: "タグを作成",
          tags: ["tags"],
          requestBody: jsonBody("TagBody"),
          responses: {
            201: jsonResponse("作成されたタグ", ref("Tag")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            409: errorResponse("同名タグが既に存在"),
          },
        },
      },
      "/api/tags/reorder": {
        post: {
          summary: "タグの並び順を一括更新",
          tags: ["tags"],
          requestBody: jsonBody("ReorderBody"),
          responses: {
            200: { description: "並び替え成功（ボディなし）" },
            400: errorResponse("ids 不正"),
            401: errorResponse("認証エラー"),
            403: errorResponse("他ユーザーの ID を含む"),
          },
        },
      },
      "/api/tags/{id}": {
        patch: {
          summary: "タグ名を変更",
          tags: ["tags"],
          parameters: [idParam],
          requestBody: jsonBody("TagBody"),
          responses: {
            200: jsonResponse("更新後のタグ", ref("Tag")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("他ユーザーのリソース"),
            404: errorResponse("未存在"),
            409: errorResponse("同名タグが既に存在"),
          },
        },
        delete: {
          summary: "タグを削除（紐づくブックマークは未分類化）",
          tags: ["tags"],
          parameters: [idParam],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            401: errorResponse("認証エラー"),
            403: errorResponse("他ユーザーのリソース"),
            404: errorResponse("未存在"),
          },
        },
      },
      "/api/ogp": {
        get: {
          summary: "指定 URL の OGP メタデータを取得",
          tags: ["ogp"],
          parameters: [
            {
              name: "url",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "http/https の URL",
            },
          ],
          responses: {
            200: jsonResponse("OGP メタデータ（取得失敗時も 200 で null）", ref("Ogp")),
            400: errorResponse("url 未指定・形式不正"),
            401: errorResponse("認証エラー"),
          },
        },
      },
    },
  };
}
