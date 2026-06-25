-- AlterTable
ALTER TABLE "tags" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: assign sort_order based on creation order per user
UPDATE "tags" t
SET "sort_order" = sub.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "created_at") - 1 AS rn
  FROM "tags"
) sub
WHERE t."id" = sub."id";
