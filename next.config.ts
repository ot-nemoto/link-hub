import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E テスト用サーバーが別の distDir を使えるようにする（.next ロック競合を防ぐ）
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // ブラウザログのターミナル転送を無効化（E2E 実行時の Clerk 開発キー警告ノイズを抑止）
  logging: { browserToTerminal: false },
};

export default nextConfig;
