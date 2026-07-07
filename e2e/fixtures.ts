import { expect, test } from "@playwright/test";

/** シードのテストユーザー共通パスワード（prisma/seed.ts と一致させる） */
export const SEED_PASSWORD = "Yakitori2026";

/** ユーザー別セッション（storageState）の保存先 */
export const AUTH_DIR = "e2e/.auth";

/**
 * テストユーザー（prisma/seed.ts と一致させる）
 * - bonjiri: 機能テスト全般（参照系）
 * - tsukune: ユーザー分離確認
 * - tebasaki: 破壊的操作テスト（作成・削除・並び替え）
 */
export type Role = "bonjiri" | "tsukune" | "tebasaki";

export const USERS: Record<Role, { email: string }> = {
  bonjiri: { email: "bonjiri@example.com" },
  tsukune: { email: "tsukune@example.com" },
  tebasaki: { email: "tebasaki@example.com" },
};

export function authState(role: Role): string {
  return `${AUTH_DIR}/${role}.json`;
}

export { expect, test };
