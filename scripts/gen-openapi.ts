import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildOpenApiDocument } from "@/lib/openapi/document";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { version: string };

const doc = buildOpenApiDocument({
  version: pkg.version,
  serverUrl: process.env.OPENAPI_SERVER_URL,
});
const outPath = resolve(root, "openapi.json");
writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);

console.log(`generated ${outPath} (openapi ${doc.openapi}, version ${doc.info.version})`);
