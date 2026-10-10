/**
 * E2Eテスト用シードスクリプト（ローカル専用）
 * 使い方: SEED_ALLOW_DESTRUCTIVE=1 npx tsx prisma/seed.ts
 *
 * - Clerk にユーザーが存在しなければ作成し、既存ユーザーにはパスワードを同期する
 * - 対象ユーザーのブックマーク・タグを全削除してから投入する
 *
 * 必要な環境変数（`.env.example` 参照）:
 * - SEED_ALLOW_DESTRUCTIVE=1 ... 破壊的操作へのオプトイン（未設定なら中断）
 * - SEED_PASSWORD            ... テストユーザー共通パスワード
 * - SEED_ALLOW_UNSEEDED_DB=1 ... 任意。シード済みでない DB に対しても実行する
 */
import { createClerkClient } from "@clerk/nextjs/server";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

// 対象ユーザーのブックマーク・タグを全削除し、Clerk ユーザーを作成・更新するため、
// 明示的なオプトインを必須にする。本番を向いた .env のまま誤実行する事故に対する
// 第一の歯止め（第二の歯止めは main() のシード済み判定）。
if (process.env.SEED_ALLOW_DESTRUCTIVE !== "1") {
  throw new Error(
    "このスクリプトは対象ユーザーのブックマーク・タグを全削除します。実行するには SEED_ALLOW_DESTRUCTIVE=1 を設定してください。",
  );
}

/** 実行に必須の環境変数を取得する（未設定なら中断） */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です。.env を確認してください（.env.example 参照）。`);
  }
  return value;
}

const adapter = new PrismaNeon({ connectionString: process.env.DIRECT_URL ?? "" });
const prisma = new PrismaClient({ adapter });

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY is not set");

const clerk = createClerkClient({ secretKey: clerkSecretKey });

// テストユーザーの共通パスワード。手動ログインでも使うため実行ごとの生成ではなく環境変数で固定する。
// 既存 Clerk ユーザーには upsertClerkUser が毎回同期する（値を変えたら次回シードで反映される）。
//
// 注意: Clerk アプリは daily-hub / eval-hub と共有しており、テストユーザーも同一である。
// この値を変更すると他 2 リポジトリの認証も変わるため、変更は 3 リポジトリ揃えて行う。
const SEED_PASSWORD = requireEnv("SEED_PASSWORD");

// ---- user1: タグフィルター・D&D・検索・削除・一括操作の検証用 ----
const USER1_EMAIL = "bonjiri@example.com";

const USER1_TAGS = ["Frontend", "Backend"];

const USER1_BOOKMARKS: {
  url: string;
  title: string;
  memo: string;
  tag: string | null;
}[] = [
  {
    url: "https://nextjs.org",
    title: "Next.js",
    memo: "React フレームワーク",
    tag: "Frontend",
  },
  {
    url: "https://vercel.com",
    title: "Vercel",
    memo: "デプロイプラットフォーム",
    tag: "Frontend",
  },
  {
    url: "https://www.prisma.io",
    title: "Prisma",
    memo: "TypeScript 向け ORM",
    tag: "Backend",
  },
  {
    url: "https://neon.tech",
    title: "Neon",
    memo: "サーバーレス PostgreSQL",
    tag: "Frontend",
  },
  {
    url: "https://github.com",
    title: "GitHub",
    memo: "コードホスティング",
    tag: null, // タグなしフィルターテスト用
  },
  {
    url: "https://playwright.dev",
    title: "Playwright",
    memo: "E2E テストフレームワーク",
    tag: null, // タグなしフィルターテスト用
  },
];

// ---- user2: ユーザー分離の検証用 ----
const USER2_EMAIL = "tsukune@example.com";

const USER2_TAGS = ["Design"];

const USER2_BOOKMARKS: {
  url: string;
  title: string;
  memo: string;
  tag: string | null;
}[] = [
  {
    url: "https://www.figma.com",
    title: "Figma",
    memo: "デザインツール",
    tag: "Design",
  },
  {
    url: "https://developer.mozilla.org",
    title: "MDN Web Docs",
    memo: "Web API リファレンス",
    tag: null,
  },
];

// ---- user3: 破壊的操作テスト用 ----
const USER3_EMAIL = "tebasaki@example.com";

const USER3_TAGS = ["Tools", "Docs"];

const USER3_BOOKMARKS: {
  url: string;
  title: string;
  memo: string;
  tag: string | null;
}[] = [
  {
    url: "https://www.typescriptlang.org",
    title: "TypeScript",
    memo: "型付き JavaScript",
    tag: "Tools",
  },
  {
    url: "https://nodejs.org",
    title: "Node.js",
    memo: "JavaScript ランタイム",
    tag: "Docs",
  },
  {
    url: "https://vitejs.dev",
    title: "Vite",
    memo: "ビルドツール",
    tag: null,
  },
  {
    url: "https://biome.dev",
    title: "Biome",
    memo: "リンター・フォーマッタ",
    tag: null,
  },
  {
    url: "https://www.npmjs.com",
    title: "npm",
    memo: "パッケージマネージャ",
    tag: null,
  },
];

/**
 * Clerk にユーザーが存在しなければ作成し、clerkId を返す。
 * 既存ユーザーにはパスワードを同期する（作成時のみでは SEED_PASSWORD を変えても旧値が残るため）。
 */
async function upsertClerkUser(email: string): Promise<string> {
  const { data: existing } = await clerk.users.getUserList({ emailAddress: [email] });
  if (existing.length > 0) {
    await clerk.users.updateUser(existing[0].id, { password: SEED_PASSWORD });
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
  bookmarks: { url: string; title: string; memo: string; tag: string | null }[],
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
    const { url, title, memo, tag } = bookmarks[i];
    let tagId: string | null = null;
    if (tag !== null) {
      const resolved = tagMap.get(tag);
      if (resolved === undefined) {
        throw new Error(`Unknown tag "${tag}" for bookmark "${title}" (${url}) of user ${email}`);
      }
      tagId = resolved;
    }
    await prisma.bookmark.create({
      data: {
        url,
        title,
        memo,
        sortOrder: i,
        userId: user.id,
        tagId,
      },
    });
  }

  console.log(
    `${email}: ブックマーク ${bookmarks.length} 件、タグ ${tagNames.length} 件を投入しました`,
  );
}

/** シード定義に含まれる全ユーザーの email（シード済み判定に使う） */
const SEED_EMAILS = [USER1_EMAIL, USER2_EMAIL, USER3_EMAIL];

async function main() {
  // 本番 DB で誤実行した場合の安全網（SEED_ALLOW_DESTRUCTIVE は .env に残りやすいため接続先をデータで判定する）。
  // シードユーザーが 1 件も居ない DB は「このシードが作った DB ではない」= 本番・ステージングの可能性がある。
  // 空の DB も通さない: 削除対象が無くても、テストユーザーを既知のパスワードで作ってしまう。
  // 新規 DB の初回シードもここで止まるが、意図的な操作なのでオプトインで明示させる。
  // 定義外ユーザーの存在自体は許容する（開発者本人のアカウントが混在しうるため）。
  const seedUserCount = await prisma.user.count({ where: { email: { in: SEED_EMAILS } } });
  if (seedUserCount === 0 && process.env.SEED_ALLOW_UNSEEDED_DB !== "1") {
    throw new Error(
      "シード定義のユーザーが 1 件も存在しません（本番 DB・未シードの新規 DB の可能性）。\n" +
        "意図した実行であれば SEED_ALLOW_UNSEEDED_DB=1 を設定してください。",
    );
  }

  await seedUser(USER1_EMAIL, USER1_TAGS, USER1_BOOKMARKS);
  await seedUser(USER2_EMAIL, USER2_TAGS, USER2_BOOKMARKS);
  await seedUser(USER3_EMAIL, USER3_TAGS, USER3_BOOKMARKS);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
