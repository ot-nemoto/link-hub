/**
 * E2Eテスト用シードスクリプト
 * 使い方: npx tsx prisma/seed.ts
 *
 * - Clerk にユーザーが存在しなければ作成する
 * - 対象ユーザーのブックマーク・タグを全削除してから投入する
 */
import { createClerkClient } from "@clerk/nextjs/server";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaNeon({ connectionString: process.env.DIRECT_URL ?? "" });
const prisma = new PrismaClient({ adapter });

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// テストユーザーの共通パスワード
const SEED_PASSWORD = "Yakitori2026";

// ---- user1: タグフィルター・D&D・検索・削除・一括操作の検証用 ----
const USER1_EMAIL = "bonjiri@example.com";

const USER1_TAGS = ["Frontend", "Backend"];

const USER1_BOOKMARKS: {
  url: string;
  title: string;
  memo: string;
  tags: string[];
}[] = [
  {
    url: "https://nextjs.org",
    title: "Next.js",
    memo: "React フレームワーク",
    tags: ["Frontend"],
  },
  {
    url: "https://vercel.com",
    title: "Vercel",
    memo: "デプロイプラットフォーム",
    tags: ["Frontend"],
  },
  {
    url: "https://www.prisma.io",
    title: "Prisma",
    memo: "TypeScript 向け ORM",
    tags: ["Backend"],
  },
  {
    url: "https://neon.tech",
    title: "Neon",
    memo: "サーバーレス PostgreSQL",
    tags: ["Frontend", "Backend"], // AND フィルターテスト用
  },
  {
    url: "https://github.com",
    title: "GitHub",
    memo: "コードホスティング",
    tags: [], // タグなしフィルターテスト用
  },
  {
    url: "https://playwright.dev",
    title: "Playwright",
    memo: "E2E テストフレームワーク",
    tags: [], // タグなしフィルターテスト用
  },
];

// ---- user2: ユーザー分離の検証用 ----
const USER2_EMAIL = "tsukune@example.com";

const USER2_TAGS = ["Design"];

const USER2_BOOKMARKS: {
  url: string;
  title: string;
  memo: string;
  tags: string[];
}[] = [
  {
    url: "https://www.figma.com",
    title: "Figma",
    memo: "デザインツール",
    tags: ["Design"],
  },
  {
    url: "https://developer.mozilla.org",
    title: "MDN Web Docs",
    memo: "Web API リファレンス",
    tags: [],
  },
];

/** Clerk にユーザーが存在しなければ作成し、clerkId を返す */
async function upsertClerkUser(email: string): Promise<string> {
  const { data: existing } = await clerk.users.getUserList({ emailAddress: [email] });
  if (existing.length > 0) {
    return existing[0].id;
  }
  const created = await clerk.users.createUser({
    emailAddress: [email],
    password: SEED_PASSWORD,
  });
  console.log(`Clerk にユーザーを作成しました: ${email}`);
  return created.id;
}

async function seedUser(
  email: string,
  tagNames: string[],
  bookmarks: { url: string; title: string; memo: string; tags: string[] }[],
) {
  const clerkId = await upsertClerkUser(email);

  // DB にユーザーが存在しなければ作成、存在すれば clerkId を同期
  const user = await prisma.user.upsert({
    where: { email },
    update: { clerkId },
    create: { email, clerkId },
  });

  // 対象ユーザーのデータをクリア
  await prisma.bookmark.deleteMany({ where: { userId: user.id } });
  await prisma.tag.deleteMany({ where: { userId: user.id } });

  // タグを作成
  const tagMap = new Map<string, string>();
  for (const name of tagNames) {
    const tag = await prisma.tag.create({ data: { name, userId: user.id } });
    tagMap.set(name, tag.id);
  }

  // ブックマークをタグ込みで作成
  for (let i = 0; i < bookmarks.length; i++) {
    const { url, title, memo, tags } = bookmarks[i];
    await prisma.bookmark.create({
      data: {
        url,
        title,
        memo,
        sortOrder: i,
        userId: user.id,
        tags: {
          create: tags.map((name) => ({ tagId: tagMap.get(name) as string })),
        },
      },
    });
  }

  console.log(
    `${email}: ブックマーク ${bookmarks.length} 件、タグ ${tagNames.length} 件を投入しました`,
  );
}

async function main() {
  await seedUser(USER1_EMAIL, USER1_TAGS, USER1_BOOKMARKS);
  await seedUser(USER2_EMAIL, USER2_TAGS, USER2_BOOKMARKS);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
