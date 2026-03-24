import { execSync } from "node:child_process";

import { loadEnvLocal } from "./load-env";

const envVars = loadEnvLocal();

export const E2E_USER_EMAIL =
  envVars.E2E_USER_EMAIL ?? process.env.E2E_USER_EMAIL ?? "e2e@link-hub-test.example.com";

export default async function globalSetup() {
  const env = { ...process.env, ...envVars };

  // テストユーザーを upsert（prisma.config.ts 経由で接続）
  const upsertSql = `
    INSERT INTO users (id, clerk_id, email, name, created_at, updated_at)
    VALUES (
      'c' || replace(gen_random_uuid()::text, '-', ''),
      'e2e-mock-clerk-id',
      '${E2E_USER_EMAIL}',
      'E2E Test User',
      NOW(), NOW()
    )
    ON CONFLICT (email) DO NOTHING;
  `;
  execSync(`echo "${upsertSql}" | npx prisma db execute --stdin`, { env, stdio: "pipe" });

  // 既存のテストブックマークをクリア（テストの冪等性を確保）
  const deleteSql = `
    DELETE FROM bookmarks
    WHERE user_id = (SELECT id FROM users WHERE email = '${E2E_USER_EMAIL}');
  `;
  execSync(`echo "${deleteSql}" | npx prisma db execute --stdin`, { env, stdio: "pipe" });
}
