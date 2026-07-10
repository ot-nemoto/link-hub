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

  it("全 $ref が components.schemas に解決できる（参照切れなし）", () => {
    const refs = [...JSON.stringify(doc).matchAll(/"#\/components\/schemas\/([A-Za-z0-9]+)"/g)].map(
      (m) => m[1],
    );
    const defined = new Set(Object.keys(doc.components.schemas));
    expect(refs.length).toBeGreaterThan(0);
    for (const name of refs) {
      expect(defined.has(name), `未定義スキーマ参照: ${name}`).toBe(true);
    }
  });
});
