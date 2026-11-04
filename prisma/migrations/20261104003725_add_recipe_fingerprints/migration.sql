-- Food scan: photo fingerprints to compare scans against. The vector type comes from the
-- pgvector extension, built into the database image (docker/postgres/Dockerfile).
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "recipe_fingerprints" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "image_id" UUID NOT NULL,
    "embedding" vector(512) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_fingerprints_image_id_key" ON "recipe_fingerprints"("image_id");

-- CreateIndex
CREATE INDEX "recipe_fingerprints_recipe_id_idx" ON "recipe_fingerprints"("recipe_id");

-- AddForeignKey
ALTER TABLE "recipe_fingerprints" ADD CONSTRAINT "recipe_fingerprints_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_fingerprints" ADD CONSTRAINT "recipe_fingerprints_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

