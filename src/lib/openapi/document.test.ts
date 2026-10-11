// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "./document";

const doc = buildOpenApiDocument({ version: "9.9.9" });

const EXPECTED_PATHS = [
  "/api/bookmarks",
  "/api/bookmarks/reorder",
  "/api/bookmarks/trash",
  "/api/bookmarks/{id}",
  "/api/bookmarks/{id}/restore",
  "/api/tags",
  "/api/tags/reorder",
  "/api/tags/{id}",
  "/api/ogp",
];

const HTTP_METHODS = ["get", "post", "patch", "put", "delete"];

describe("buildOpenApiDocument", () => {
  it("OpenAPI 3.1・version・security scheme（Bearer）", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info.title).toBeTruthy();
    expect(doc.info.version).toBe("9.9.9");
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(doc.security).toEqual([{ bearerAuth: [] }]);
  });

  it("serverUrl（オリジン）を渡すと servers 先頭に入り、localhost が続く（未指定は localhost のみ）", () => {
    const withServer = buildOpenApiDocument({
      version: "1.0.0",
      serverUrl: "https://api.example.com",
    });
    expect(withServer.servers).toEqual([
      { url: "https://api.example.com" },
      { url: "http://localhost:3000", description: "ローカル開発" },
    ]);

    expect(doc.servers).toEqual([{ url: "http://localhost:3000", description: "ローカル開発" }]);
  });

  it("serverUrl が localhost（ポート違い含む）のときは servers を重複させない", () => {
    const local = buildOpenApiDocument({ version: "1.0.0", serverUrl: "http://localhost:3000" });
    expect(local.servers).toEqual([{ url: "http://localhost:3000" }]);

    const otherPort = buildOpenApiDocument({
      version: "1.0.0",
      serverUrl: "http://localhost:3001",
    });
    expect(otherPort.servers).toEqual([{ url: "http://localhost:3001" }]);
  });

  it("全エンドポイント（9 パス / 15 オペレーション）が含まれる", () => {
    expect(Object.keys(doc.paths).sort()).toEqual([...EXPECTED_PATHS].sort());

    const opCount = Object.values(doc.paths).reduce(
      (n, item) => n + Object.keys(item).filter((k) => HTTP_METHODS.includes(k)).length,
      0,
    );
    expect(opCount).toBe(15);
  });

  it("各オペレーションに summary と responses がある", () => {
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(item as Record<string, unknown>)) {
        if (!HTTP_METHODS.includes(method)) continue;
        const operation = op as { summary?: string; responses?: Record<string, unknown> };
        expect(operation.summary, `${method} ${path} summary`).toBeTruthy();
        expect(
          Object.keys(operation.responses ?? {}).length,
          `${method} ${path} responses`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("components.schemas に主要スキーマがある", () => {
    expect(Object.keys(doc.components.schemas)).toEqual(
      expect.arrayContaining([
        "Error",
        "BookmarkBody",
        "Bookmark",
        "ReorderBody",
        "TagBody",
        "Tag",
        "Ogp",
      ]),
    );
  });

  it("components.schemas に additionalProperties を残さない（実サーバーの strip 挙動と整合）", () => {
    expect(JSON.stringify(doc.components.schemas)).not.toContain("additionalProperties");
  });

  it("url フィールドに http/https を示す description が付く", () => {
    const bookmarkBody = JSON.parse(JSON.stringify(doc.components.schemas.BookmarkBody));
    expect(bookmarkBody.properties.url.description).toBeTruthy();
  });

  it("全 $ref が components に解決でき（参照切れなし）、未使用の responses も無い", () => {
    const json = JSON.stringify(doc);
    const refs = [
      ...json.matchAll(/"\$ref":"#\/components\/(schemas|responses)\/([A-Za-z0-9]+)"/g),
    ];
    const allRefs = [...json.matchAll(/"\$ref":"([^"]+)"/g)].map((m) => m[1]);
    expect(refs.length).toBe(allRefs.length);

    const defined = {
      schemas: new Set(Object.keys(doc.components.schemas)),
      responses: new Set(Object.keys(doc.components.responses)),
    };
    for (const [, kind, name] of refs) {
      expect(defined[kind as keyof typeof defined].has(name), `未定義参照: ${kind}/${name}`).toBe(
        true,
      );
    }
    const usedResponses = new Set(refs.filter((m) => m[1] === "responses").map((m) => m[2]));
    expect(usedResponses).toEqual(defined.responses);
  });

  it("4xx はすべて components.responses への $ref（{ error } スキーマを持つ）", () => {
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(item)) {
        for (const [status, res] of Object.entries(op.responses)) {
          if (Number(status) < 400) continue;
          expect(res, `${method.toUpperCase()} ${path} ${status}`).toEqual({
            $ref: expect.stringMatching(/^#\/components\/responses\//),
          });
        }
      }
    }
    for (const res of Object.values(doc.components.responses)) {
      expect(res.description).toBeTruthy();
      expect(res.content["application/json"].schema).toEqual({
        $ref: "#/components/schemas/Error",
      });
    }
  });

  it("info.description に認証・共通仕様・エラー形式・破壊的変更・クイックスタートを含む", () => {
    const description = doc.info.description;
    for (const expected of [
      "Authorization: Bearer <api-key>",
      "lh_",
      "Access-Control-Allow-Origin: *",
      "strip",
      "ソフトデリート",
      '{ "error": "<メッセージ>" }',
      "409",
      "`category` から `tag` にリネーム",
      "curl -s",
    ]) {
      expect(description).toContain(expected);
    }
  });
});
