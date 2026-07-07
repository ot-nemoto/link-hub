import { execSync } from "node:child_process";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

import { authState, type Role, SEED_PASSWORD, USERS } from "./fixtures";

// Clerk Testing Token の準備とシード投入（スイート開始前に1回）
setup("prepare clerk and seed", async () => {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY が未設定です。E2E 実行前に .env を確認してください。",
    );
  }
  if (process.env.MOCK_USER_ID || process.env.MOCK_USER_EMAIL) {
    throw new Error(
      "MOCK_USER_ID / MOCK_USER_EMAIL が設定されています。E2E は Clerk 認証を使うため .env から外してください。",
    );
  }
  await clerkSetup({ publishableKey });
  execSync("npx tsx prisma/seed.ts", { cwd: process.cwd(), stdio: "inherit" });
});

// ユーザーごとにログインし、セッションを storageState として保存する
for (const [role, { email }] of Object.entries(USERS) as [Role, { email: string }][]) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-in");
    await clerk.signIn({
      page,
      signInParams: { strategy: "password", identifier: email, password: SEED_PASSWORD },
    });

    // ログイン済みセッションでアプリに入れることを確認
    await page.goto("/bookmarks");
    await expect(page.getByText(email)).toBeVisible();

    await page.context().storageState({ path: authState(role) });
  });
}
