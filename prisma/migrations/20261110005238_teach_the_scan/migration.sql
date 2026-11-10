-- Teach the scan: a scan's fingerprint is kept for an hour (scans), and confirming it stores it
-- as one more example of a recipe (recipe_fingerprints rows with no image).

-- AlterTable
ALTER TABLE "recipe_fingerprints" ADD COLUMN     "scan_id" UUID,
ADD COLUMN     "taught_by_id" UUID,
ALTER COLUMN "image_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "scans" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "embedding" vector(512) NOT NULL,
    "matched_recipe_ids" UUID[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scans_user_id_idx" ON "scans"("user_id");

-- CreateIndex
CREATE INDEX "scans_created_at_idx" ON "scans"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_fingerprints_scan_id_key" ON "recipe_fingerprints"("scan_id");

-- CreateIndex
CREATE INDEX "recipe_fingerprints_taught_by_id_idx" ON "recipe_fingerprints"("taught_by_id");

-- AddForeignKey
ALTER TABLE "recipe_fingerprints" ADD CONSTRAINT "recipe_fingerprints_taught_by_id_fkey" FOREIGN KEY ("taught_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A row comes from exactly one place: a recipe photo, or a user's confirmed scan.
ALTER TABLE "recipe_fingerprints" ADD CONSTRAINT "recipe_fingerprints_one_source" CHECK (
  ("image_id" IS NOT NULL AND "taught_by_id" IS NULL AND "scan_id" IS NULL)
  OR ("image_id" IS NULL AND "taught_by_id" IS NOT NULL AND "scan_id" IS NOT NULL)
);
