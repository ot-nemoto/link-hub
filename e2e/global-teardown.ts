import { execSync } from "node:child_process";

import { E2E_USER_EMAIL } from "./global-setup";
import { loadEnvLocal } from "./load-env";

const envVars = loadEnvLocal();

export default async function globalTeardown() {
  const env = { ...process.env, ...envVars };

  // テストで作成したブックマークを削除
  const deleteSql = `
    DELETE FROM bookmarks
    WHERE user_id = (SELECT id FROM users WHERE email = '${E2E_USER_EMAIL}');
  `;
  execSync(`echo "${deleteSql}" | npx prisma db execute --stdin`, { env, stdio: "pipe" });
}
