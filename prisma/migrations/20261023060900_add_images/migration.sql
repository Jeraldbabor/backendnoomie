-- Uploaded images (recipe photos, profile photos). The files are in S3-compatible storage under
-- images/<id>/; these rows hold their owner and size, and recipes and users point at them.

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "photo_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "photo_id" UUID;

-- CreateTable
CREATE TABLE "images" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "images_owner_id_idx" ON "images"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_photo_id_key" ON "recipes"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_photo_id_key" ON "users"("photo_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

