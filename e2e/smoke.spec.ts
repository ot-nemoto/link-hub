import { authState, expect, test, USERS } from "./fixtures";

/**
 * 基盤のスモークテスト
 * 各ユーザーの保存済みセッションで /bookmarks が表示されることを確認する。
 */

test.describe("bonjiri のセッション", () => {
  test.use({ storageState: authState("bonjiri") });

  test("/bookmarks が表示され、シードのブックマークが見える", async ({ page }) => {
    await page.goto("/bookmarks");
    await expect(page.getByText(USERS.bonjiri.email)).toBeVisible();
    await expect(page.getByText("Next.js", { exact: true })).toBeVisible();
  });
});

test.describe("tsukune のセッション", () => {
  test.use({ storageState: authState("tsukune") });

  test("/bookmarks が表示され、シードのブックマークが見える", async ({ page }) => {
    await page.goto("/bookmarks");
    await expect(page.getByText(USERS.tsukune.email)).toBeVisible();
    await expect(page.getByText("Figma", { exact: true })).toBeVisible();
  });
});

test.describe("tebasaki のセッション", () => {
  test.use({ storageState: authState("tebasaki") });

  test("/bookmarks が表示され、シードのブックマークが見える", async ({ page }) => {
    await page.goto("/bookmarks");
    await expect(page.getByText(USERS.tebasaki.email)).toBeVisible();
    await expect(page.getByText("TypeScript", { exact: true })).toBeVisible();
  });
});
