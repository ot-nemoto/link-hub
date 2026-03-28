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

// F-20: 削除 Undo
test.describe("削除 Undo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bookmarks/new");
    await page.fill('input[name="url"]', "https://undo-test.example.com");
    await page.fill('input[name="title"]', "Undo テスト用");
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page).toHaveURL("/bookmarks");
  });

  test("削除後にスナックバーが表示される", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.getByRole("button", { name: "削除" }).first().click();
    await expect(page.getByText("削除しました")).toBeVisible();
    await expect(page.getByRole("button", { name: "元に戻す" })).toBeVisible();
  });

  test("「元に戻す」を押すと削除したブックマークが復元される", async ({ page }) => {
    await page.goto("/bookmarks");
    const initialCount = await page.getByRole("link", { name: "Undo テスト用" }).count();

    // "Undo テスト用" を含む li の削除ボタンをピンポイントでクリック
    const item = page.locator("li").filter({ has: page.getByRole("link", { name: "Undo テスト用" }) }).first();
    await item.getByRole("button", { name: "削除" }).click();
    // 件数が 1 件減ることを確認（ロケーター再評価で別 li を指す問題を回避）
    await expect(page.getByRole("link", { name: "Undo テスト用" })).toHaveCount(initialCount - 1);

    await page.getByRole("button", { name: "元に戻す" }).click();
    // 件数が元に戻ることを確認
    await expect(page.getByRole("link", { name: "Undo テスト用" })).toHaveCount(initialCount);
  });
});

// F-21: 一括削除
test.describe("一括削除", () => {
  test.beforeEach(async ({ page }) => {
    for (const title of ["一括削除A", "一括削除B"]) {
      await page.goto("/bookmarks/new");
      await page.fill('input[name="url"]', "https://bulk-delete.example.com");
      await page.fill('input[name="title"]', title);
      await page.getByRole("button", { name: "保存" }).click();
      await expect(page).toHaveURL("/bookmarks");
    }
  });

  test("チェックボックスで選択後に一括削除できる", async ({ page }) => {
    await page.goto("/bookmarks");
    await expect(page.getByRole("link", { name: "一括削除A" })).toBeVisible();
    await expect(page.getByRole("link", { name: "一括削除B" })).toBeVisible();

    // 「一括削除A」のチェックボックスを選択
    await page.getByRole("checkbox", { name: "一括削除Aを選択" }).check();
    await page.getByRole("button", { name: /選択削除/ }).click();

    await expect(page.getByRole("link", { name: "一括削除A" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: "一括削除B" })).toBeVisible();
  });

  test("「全選択」で全件チェックして一括削除できる", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.getByRole("button", { name: "全選択" }).click();
    await page.getByRole("button", { name: /選択削除/ }).click();

    await expect(page.getByRole("link", { name: "一括削除A" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: "一括削除B" })).not.toBeVisible();
  });
});

// F-15: キーワード検索
test.describe("キーワード検索", () => {
  test.beforeEach(async ({ page }) => {
    for (const [url, title, memo] of [
      ["https://search-alpha.example.com", "Alpha タイトル", ""],
      ["https://search-beta.example.com", "Beta タイトル", "アルファメモ"],
    ]) {
      await page.goto("/bookmarks/new");
      await page.fill('input[name="url"]', url);
      await page.fill('input[name="title"]', title);
      if (memo) await page.fill('textarea[name="memo"]', memo);
      await page.getByRole("button", { name: "保存" }).click();
      await expect(page).toHaveURL("/bookmarks");
    }
  });

  test("タイトルで絞り込まれる", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.fill('input[name="q"]', "Alpha");
    await page.getByRole("searchbox").press("Enter");

    await expect(page.getByRole("link", { name: "Alpha タイトル" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Beta タイトル" })).not.toBeVisible();
  });

  test("URL で絞り込まれる", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.fill('input[name="q"]', "search-beta");
    await page.getByRole("searchbox").press("Enter");

    // 複数テスト実行で累積する場合があるため first() で存在を確認
    await expect(page.getByRole("link", { name: "Beta タイトル" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Alpha タイトル" })).not.toBeVisible();
  });

  test("メモで絞り込まれる", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.fill('input[name="q"]', "アルファメモ");
    await page.getByRole("searchbox").press("Enter");

    await expect(page.getByRole("link", { name: "Beta タイトル" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Alpha タイトル" })).not.toBeVisible();
  });

  test("ヒットしない場合は「該当するブックマークがありません」を表示する", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.fill('input[name="q"]', "存在しないキーワードxyz");
    await page.getByRole("searchbox").press("Enter");

    await expect(page.getByText("該当するブックマークがありません")).toBeVisible();
  });
});

// F-22: ソート切り替え
test.describe("ソート切り替え", () => {
  test.beforeEach(async ({ page }) => {
    for (const [url, title] of [
      ["https://sort-aaa.example.com", "AAA ソートテスト"],
      ["https://sort-zzz.example.com", "ZZZ ソートテスト"],
    ]) {
      await page.goto("/bookmarks/new");
      await page.fill('input[name="url"]', url);
      await page.fill('input[name="title"]', title);
      await page.getByRole("button", { name: "保存" }).click();
      await expect(page).toHaveURL("/bookmarks");
    }
  });

  test("タイトル昇順に切り替えると AAA が先に表示される", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.selectOption('select[name="sort"]', "title_asc");
    await page.waitForURL(/sort=title_asc/);

    const links = page.getByRole("link", { name: /ソートテスト/ });
    await expect(links.first()).toHaveText("AAA ソートテスト");
  });

  test("タイトル降順に切り替えると ZZZ が先に表示される", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.selectOption('select[name="sort"]', "title_desc");
    await page.waitForURL(/sort=title_desc/);

    const links = page.getByRole("link", { name: /ソートテスト/ });
    await expect(links.first()).toHaveText("ZZZ ソートテスト");
  });
});

// F-23: 表示件数変更
test.describe("表示件数変更", () => {
  test("5件に変更するとクエリパラメータが更新される", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.selectOption('select[name="limit"]', "5");
    await page.waitForURL(/limit=5/);

    await expect(page).toHaveURL(/limit=5/);
  });
});

// F-17: ページネーション
test.describe("ページネーション", () => {
  test.beforeEach(async ({ page }) => {
    // 6件登録（limit=5 で2ページになる）
    for (let i = 1; i <= 6; i++) {
      await page.goto("/bookmarks/new");
      await page.fill('input[name="url"]', `https://pagination-${i}.example.com`);
      await page.fill('input[name="title"]', `ページネーション${i}`);
      await page.getByRole("button", { name: "保存" }).click();
      await expect(page).toHaveURL("/bookmarks");
    }
  });

  test("limit=5 で複数ページに分割され「次へ」で遷移できる", async ({ page }) => {
    await page.goto("/bookmarks?limit=5");
    // 累積ブックマークがあるため総ページ数は可変。"1 / N ページ" 形式を正規表現で確認
    await expect(page.getByText(/^1 \/ \d+ ページ$/)).toBeVisible();
    await expect(page.getByRole("link", { name: "次へ" })).toBeVisible();

    await page.getByRole("link", { name: "次へ" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/^2 \/ \d+ ページ$/)).toBeVisible();
  });

  test("2ページ目から「前へ」で1ページ目に戻れる", async ({ page }) => {
    await page.goto("/bookmarks?limit=5&page=2");
    await page.getByRole("link", { name: "前へ" }).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(page.getByText(/^1 \/ \d+ ページ$/)).toBeVisible();
  });
});

// F-18: カード/リスト表示切り替え
test.describe("カード/リスト表示切り替え", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bookmarks/new");
    await page.fill('input[name="url"]', "https://view-toggle.example.com");
    await page.fill('input[name="title"]', "表示切り替えテスト");
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page).toHaveURL("/bookmarks");
  });

  test("リスト表示ボタンを押すとリスト表示に切り替わる", async ({ page }) => {
    await page.goto("/bookmarks");
    // デフォルトはカード表示（ul.grid が存在する）
    await expect(page.locator("ul.grid")).toBeVisible();

    await page.getByTitle("リスト表示").click();
    // リスト表示では ul.grid が消えて ul.divide-y が表示される
    await expect(page.locator("ul.grid")).not.toBeVisible();
    await expect(page.locator("ul.divide-y")).toBeVisible();
  });

  test("カード表示ボタンを押すとカード表示に戻る", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.getByTitle("リスト表示").click();
    await expect(page.locator("ul.divide-y")).toBeVisible();

    await page.getByTitle("カード表示").click();
    await expect(page.locator("ul.grid")).toBeVisible();
  });
});

// F-19: ダークモード
test.describe("ダークモード切り替え", () => {
  test("ダークモードトグルを押すと html に dark クラスが付く", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.getByTitle("ダークモードに切り替え").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("ダークモードをライトに戻すと dark クラスが外れる", async ({ page }) => {
    await page.goto("/bookmarks");
    await page.getByTitle("ダークモードに切り替え").click();
    await page.getByTitle("ライトモードに切り替え").click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});
