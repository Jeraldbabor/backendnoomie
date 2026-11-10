-- Starter dishes: example photos (from Wikimedia Commons) teach the scan what common dishes
-- look like. Only the fingerprint is kept, with the photo's file name and credit.

-- AlterTable
ALTER TABLE "recipe_fingerprints" ADD COLUMN     "example_credit" TEXT,
ADD COLUMN     "example_file" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "recipe_fingerprints_recipe_id_example_file_key" ON "recipe_fingerprints"("recipe_id", "example_file");

-- A row comes from exactly one place: a recipe photo, a user's confirmed scan, or a starter
-- dish's example photo.
ALTER TABLE "recipe_fingerprints" DROP CONSTRAINT "recipe_fingerprints_one_source";
ALTER TABLE "recipe_fingerprints" ADD CONSTRAINT "recipe_fingerprints_one_source" CHECK (
  ("image_id" IS NOT NULL AND "taught_by_id" IS NULL AND "scan_id" IS NULL AND "example_file" IS NULL)
  OR ("image_id" IS NULL AND "taught_by_id" IS NOT NULL AND "scan_id" IS NOT NULL AND "example_file" IS NULL)
  OR ("image_id" IS NULL AND "taught_by_id" IS NULL AND "scan_id" IS NULL AND "example_file" IS NOT NULL
      AND "example_credit" IS NOT NULL)
);
