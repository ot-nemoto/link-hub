import { expect, test } from "@playwright/test";

// 疎通確認：サーバーが起動してページが返ってくるか
test("port 3000 が応答する", async ({ page }) => {
  const res = await page.goto("http://localhost:3000/");
  expect(res?.status()).toBeLessThan(500);
});

test("port 3001 が応答する", async ({ page }) => {
  const res = await page.goto("http://localhost:3001/");
  expect(res?.status()).toBeLessThan(500);
});
