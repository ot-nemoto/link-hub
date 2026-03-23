import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E テスト用サーバーが別の distDir を使えるようにする（.next ロック競合を防ぐ）
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
