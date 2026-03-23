import { expect, test } from "@playwright/test";

test.describe("未認証時のリダイレクト", () => {
  test("/bookmarks にアクセスすると /sign-in にリダイレクトされる", async ({ page }) => {
    await page.goto("/bookmarks");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("/bookmarks/new にアクセスすると /sign-in にリダイレクトされる", async ({ page }) => {
    await page.goto("/bookmarks/new");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
