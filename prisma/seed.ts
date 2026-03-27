/**
 * テストデータ投入スクリプト
 * 使い方: npx tsx prisma/seed.ts
 *
 * 環境変数 SEED_USER_EMAIL でユーザーを指定（未指定時は DB の最初のユーザー）
 */
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaNeon({ connectionString: process.env.DIRECT_URL ?? "" });
const prisma = new PrismaClient({ adapter });

const SEED_BOOKMARKS = [
  {
    url: "https://nextjs.org",
    title: "Next.js",
    memo: "React フレームワーク",
    ogImage: "https://nextjs.org/static/twitter-cards/home.jpg",
  },
  {
    url: "https://www.typescriptlang.org",
    title: "TypeScript",
    memo: "型付き JavaScript",
    ogImage: null,
  },
  {
    url: "https://tailwindcss.com",
    title: "Tailwind CSS",
    memo: "ユーティリティファースト CSS",
    ogImage: "https://tailwindcss.com/opengraph-image.jpg",
  },
  {
    url: "https://zod.dev",
    title: "Zod",
    memo: "TypeScript ファーストのバリデーションライブラリ",
    ogImage: null,
  },
  {
    url: "https://www.prisma.io",
    title: "Prisma",
    memo: "Node.js / TypeScript 向け ORM",
    ogImage: "https://www.prisma.io/images/og-image.png",
  },
  {
    url: "https://clerk.com",
    title: "Clerk",
    memo: "認証・ユーザー管理サービス",
    ogImage: null,
  },
  {
    url: "https://vercel.com",
    title: "Vercel",
    memo: "フロントエンドのデプロイプラットフォーム",
    ogImage: null,
  },
  {
    url: "https://github.com",
    title: "GitHub",
    memo: "コードホスティング",
    ogImage: null,
  },
  {
    url: "https://playwright.dev",
    title: "Playwright",
    memo: "E2E テストフレームワーク",
    ogImage: null,
  },
  {
    url: "https://vitest.dev",
    title: "Vitest",
    memo: "Vite ベースのユニットテストフレームワーク",
    ogImage: null,
  },
  {
    url: "https://react.dev",
    title: "React",
    memo: "UI ライブラリ",
    ogImage: null,
  },
  {
    url: "https://biomejs.dev",
    title: "Biome",
    memo: "高速なリンター・フォーマッター",
    ogImage: null,
  },
  {
    url: "https://neon.tech",
    title: "Neon",
    memo: "サーバーレス PostgreSQL",
    ogImage: null,
  },
  {
    url: "https://www.postgresql.org",
    title: "PostgreSQL",
    memo: "オープンソースのリレーショナル DB",
    ogImage: null,
  },
  {
    url: "https://node.green",
    title: "Node.js Compatibility",
    memo: "Node.js の ES 機能対応表",
    ogImage: null,
  },
  {
    url: "https://www.npmjs.com",
    title: "npm",
    memo: "Node.js パッケージマネージャー",
    ogImage: null,
  },
  {
    url: "https://turbo.build",
    title: "Turborepo",
    memo: "モノレポ向けビルドシステム",
    ogImage: null,
  },
  {
    url: "https://storybook.js.org",
    title: "Storybook",
    memo: "UI コンポーネント開発ツール",
    ogImage: null,
  },
  {
    url: "https://jestjs.io",
    title: "Jest",
    memo: "JavaScript テストフレームワーク",
    ogImage: null,
  },
  {
    url: "https://testing-library.com",
    title: "Testing Library",
    memo: "ユーザー視点のテストユーティリティ",
    ogImage: null,
  },
  {
    url: "https://eslint.org",
    title: "ESLint",
    memo: "JavaScript / TypeScript リンター",
    ogImage: null,
  },
  {
    url: "https://prettier.io",
    title: "Prettier",
    memo: "コードフォーマッター",
    ogImage: null,
  },
];

async function main() {
  const email = process.env.SEED_USER_EMAIL;

  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (!user) {
    console.error(
      email
        ? `ユーザーが見つかりません: ${email}`
        : "ユーザーが存在しません。先にアプリにサインインしてください。",
    );
    process.exit(1);
  }

  console.log(`対象ユーザー: ${user.email}`);

  const created = await prisma.bookmark.createMany({
    data: SEED_BOOKMARKS.map((b) => ({ ...b, userId: user.id })),
    skipDuplicates: true,
  });

  console.log(`${created.count} 件のブックマークを投入しました。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
