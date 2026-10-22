-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "author_id" UUID;

-- CreateIndex
CREATE INDEX "recipes_author_id_idx" ON "recipes"("author_id");

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
