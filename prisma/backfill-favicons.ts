/**
 * 既存ブックマークのファビコン一括取得スクリプト（手動実行専用）
 * 使い方: npx tsx prisma/backfill-favicons.ts
 *
 * - `favicon` が NULL の未削除ブックマークを対象に、ブックマーク先のサイトから
 *   ファビコン URL を取得して DB に保存する（取得方法は src/lib/ogp.ts の fetchOgpData と同じ）
 * - 同一ホストへの取得は 1 回にまとめ、代表の 1 件から取得した URL を同ホストの全ブックマークに適用する
 * - ホスト間は HOST_INTERVAL_MS だけ間隔を空けて実行し、相手サイトへの連続アクセスを避ける
 * - 取得できなかった場合は NULL のままにする（一覧は従来どおり Google のファビコンサービスで表示される）
 */
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

import { getDomain } from "../src/lib/domain-groups";
import { fetchOgpData } from "../src/lib/ogp";

dotenv.config({ path: ".env" });

const adapter = new PrismaNeon({ connectionString: process.env.DIRECT_URL ?? "" });
const prisma = new PrismaClient({ adapter });

// 同一ホストへの連続アクセスを避けるための待機間隔
const HOST_INTERVAL_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const targets = await prisma.bookmark.findMany({
    where: { favicon: null, deletedAt: null },
    select: { id: true, url: true },
  });
  console.log(`対象ブックマーク: ${targets.length} 件`);

  // 同一ホストへの取得を 1 回にまとめるため、ホストごとにグルーピングする
  const byHost = new Map<string, { id: string; url: string }[]>();
  for (const bm of targets) {
    const host = getDomain(bm.url);
    if (!host) continue;
    const list = byHost.get(host) ?? [];
    list.push(bm);
    byHost.set(host, list);
  }
  console.log(`対象ホスト: ${byHost.size} 件`);

  let updated = 0;
  let hostIndex = 0;
  for (const [host, bookmarks] of byHost) {
    hostIndex++;

    // 代表の1件（先頭）からファビコンを取得し、同ホストの全ブックマークに適用する
    const result = await fetchOgpData(bookmarks[0].url);
    if (result.favicon) {
      await prisma.bookmark.updateMany({
        where: { id: { in: bookmarks.map((b) => b.id) } },
        data: { favicon: result.favicon },
      });
      updated += bookmarks.length;
      console.log(`[${hostIndex}/${byHost.size}] ${host}: ${result.favicon}`);
    } else {
      console.log(`[${hostIndex}/${byHost.size}] ${host}: 取得できませんでした（スキップ）`);
    }

    if (hostIndex < byHost.size) await sleep(HOST_INTERVAL_MS);
  }

  console.log(`完了: ${updated} / ${targets.length} 件のファビコンを更新しました`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
