-- AlterTable: add tag_id column to bookmarks
ALTER TABLE "bookmarks" ADD COLUMN "tag_id" TEXT;

-- Migrate data: copy first tag from bookmark_tags to bookmarks.tag_id
UPDATE "bookmarks" b
SET "tag_id" = (
  SELECT bt."tag_id"
  FROM "bookmark_tags" bt
  WHERE bt."bookmark_id" = b."id"
  LIMIT 1
);

-- DropTable: remove bookmark_tags
DROP TABLE "bookmark_tags";

-- CreateIndex
CREATE INDEX "bookmarks_tag_id_idx" ON "bookmarks"("tag_id");

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;
