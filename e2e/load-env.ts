import fs from "node:fs";
import path from "node:path";

/**
 * dotenvx v17 の挙動に依存せず .env.local を直接パースして返す
 */
export function loadEnvLocal(): Record<string, string> {
  const filePath = path.resolve(process.cwd(), ".env.local");
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const result: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (key) result[key] = val;
    }
    return result;
  } catch {
    return {};
  }
}
