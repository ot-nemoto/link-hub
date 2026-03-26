import { expect, test } from "@playwright/test";

test.describe("ブックマーク一覧", () => {
  test("初期状態では空状態メッセージが表示される", async ({ page }) => {
    await page.goto("/bookmarks");
    await expect(page.getByText("ブックマークがありません")).toBeVisible();
  });

  test("「追加」ボタンで登録フォームに遷移する", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.getByRole("link", { name: "追加" }).click();
    await expect(page).toHaveURL("/bookmarks/new");
  });
});

test.describe("ブックマーク登録", () => {
  test("必須項目を入力して保存すると一覧に追加される", async ({ page }) => {
    await page.goto("/bookmarks/new");
    await page.fill('input[name="url"]', "https://nextjs.org");
    await page.fill('input[name="title"]', "Next.js 公式");
    await page.fill('textarea[name="memo"]', "フレームワーク公式サイト");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page).toHaveURL("/bookmarks");
    await expect(page.getByText("Next.js 公式")).toBeVisible();
    await expect(page.getByText("https://nextjs.org")).toBeVisible();
  });

  test("URL が空のままだとエラーが表示される", async ({ page }) => {
    await page.goto("/bookmarks/new");
    await page.fill('input[name="title"]', "タイトル");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page.getByText("URL は必須です")).toBeVisible();
    await expect(page).toHaveURL("/bookmarks/new");
  });

  test("不正な URL を入力するとエラーが表示される", async ({ page }) => {
    await page.goto("/bookmarks/new");
    await page.fill('input[name="url"]', "not-a-url");
    await page.fill('input[name="title"]', "タイトル");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page.getByText("有効な URL を入力してください")).toBeVisible();
  });

  test("「キャンセル」で一覧ページに戻る", async ({ page }) => {
    await page.goto("/bookmarks/new");
    await page.getByRole("button", { name: "キャンセル" }).click();
    await expect(page).toHaveURL("/bookmarks");
  });

  test("javascript: スキームの URL を入力するとエラーが表示される", async ({ page }) => {
    await page.goto("/bookmarks/new");
    await page.fill('input[name="url"]', "javascript:alert(1)");
    await page.fill('input[name="title"]', "タイトル");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page.getByText("URL は http:// または https:// で始まる必要があります")).toBeVisible();
    await expect(page).toHaveURL("/bookmarks/new");
  });

  test("メモを含むブックマークを登録して一覧に表示される", async ({ page }) => {
    await page.goto("/bookmarks/new");
    await page.fill('input[name="url"]', "https://zod.dev");
    await page.fill('input[name="title"]', "Zod");
    await page.fill('textarea[name="memo"]', "TypeScript ファーストのバリデーションライブラリ");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page).toHaveURL("/bookmarks");
    await expect(page.getByRole("link", { name: "Zod" })).toBeVisible();
    await expect(page.getByText("TypeScript ファーストのバリデーションライブラリ")).toBeVisible();
  });
});

test.describe("ブックマーク編集", () => {
  test.beforeEach(async ({ page }) => {
    // テスト用ブックマークを登録
    await page.goto("/bookmarks/new");
    await page.fill('input[name="url"]', "https://playwright.dev");
    await page.fill('input[name="title"]', "Playwright");
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page).toHaveURL("/bookmarks");
  });

  test("編集フォームの「キャンセル」で一覧ページに戻る", async ({ page }) => {
    // dev モードの初回コンパイルに備え、タイムアウトを3倍（90秒）に延長
    test.slow();
    await page.goto("/bookmarks");
    await page.getByRole("link", { name: "編集" }).first().click();
    // URL 変化ではなく、編集フォームの表示を直接待機する
    await expect(page.getByRole("button", { name: "キャンセル" })).toBeVisible({ timeout: 90000 });
    await page.getByRole("button", { name: "キャンセル" }).click();
    await expect(page).toHaveURL("/bookmarks");
  });

  test("編集フォームに既存データが表示され、更新できる", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.getByRole("link", { name: "編集" }).first().click();
    await page.waitForURL(/\/bookmarks\/.+\/edit/);
    await expect(page.locator('input[name="url"]')).toHaveValue("https://playwright.dev");
    await expect(page.locator('input[name="title"]')).toHaveValue("Playwright");

    await page.fill('input[name="title"]', "Playwright 公式");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page).toHaveURL("/bookmarks");
    await expect(page.getByText("Playwright 公式")).toBeVisible();
  });
});

test.describe("ブックマーク削除", () => {
  test.beforeEach(async ({ page }) => {
    // テスト用ブックマークを登録
    await page.goto("/bookmarks/new");
    await page.fill('input[name="url"]', "https://vitest.dev");
    await page.fill('input[name="title"]', "Vitest");
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page).toHaveURL("/bookmarks");
  });

  test("削除ボタンを押すと一覧から消える", async ({ page }) => {
    await page.goto("/bookmarks");
    await expect(page.getByRole("link", { name: "Vitest" })).toBeVisible();

    await page.getByRole("button", { name: "削除" }).first().click();
    await expect(page.getByRole("link", { name: "Vitest" })).not.toBeVisible();
  });
});
