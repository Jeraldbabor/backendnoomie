-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "cuisine" VARCHAR(60) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "ingredients" TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipes_cuisine_idx" ON "recipes"("cuisine");
