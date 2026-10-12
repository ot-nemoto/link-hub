-- AlterTable
ALTER TABLE "users" ADD COLUMN     "api_key_created_at" TIMESTAMP(3),
ADD COLUMN     "api_key_hash" TEXT,
ADD COLUMN     "api_key_last_used_at" TIMESTAMP(3),
ADD COLUMN     "api_key_prefix" TEXT;

-- 既存の平文キーをハッシュ化して移行する（利用者の再発行は不要）。
-- アプリ側 hashApiKey()（UTF-8 バイト列の SHA-256・hex）と一致させるため、
-- バックスラッシュをエスケープとして解釈する `api_key::bytea` ではなく convert_to を使う。
-- 元の発行日時は記録がないため、api_key_created_at は移行時刻とする。
UPDATE "users"
SET "api_key_hash" = encode(sha256(convert_to("api_key", 'UTF8')), 'hex'),
    "api_key_prefix" = left("api_key", 8),
    "api_key_created_at" = CURRENT_TIMESTAMP
WHERE "api_key" IS NOT NULL;

-- DropIndex
DROP INDEX "users_api_key_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "api_key";

-- CreateIndex
CREATE UNIQUE INDEX "users_api_key_hash_key" ON "users"("api_key_hash");
