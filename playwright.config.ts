import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL ?? "e2e@link-hub-test.example.com";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  projects: [
    // 疎通確認
    {
      name: "smoke",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/smoke.spec.ts",
    },
    // 認証済みテスト（MOCK_USER_EMAIL でバイパス）
    {
      name: "authenticated",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3001",
      },
      testMatch: "**/bookmarks.spec.ts",
    },
    // 未認証テスト（MOCK なしでリダイレクト確認）
    {
      name: "unauthenticated",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
      },
      testMatch: "**/auth.spec.ts",
    },
  ],
  webServer: [
    // Port 3000: MOCK なし（未認証テスト用）
    {
      command: "next dev -p 3000",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        DIRECT_URL: process.env.DIRECT_URL ?? "",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in",
        NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? "/bookmarks",
        MOCK_USER_EMAIL: "",
        MOCK_USER_ID: "",
      },
    },
    // Port 3001: MOCK_USER_EMAIL あり（認証済みテスト用）
    // NEXT_DIST_DIR を分けることで port 3000 の .next ロックとの競合を防ぐ
    {
      command: "next dev -p 3001",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        DIRECT_URL: process.env.DIRECT_URL ?? "",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in",
        NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? "/bookmarks",
        MOCK_USER_EMAIL: E2E_USER_EMAIL,
        MOCK_USER_ID: "",
        NEXT_DIST_DIR: ".next-e2e",
      },
    },
  ],
});
