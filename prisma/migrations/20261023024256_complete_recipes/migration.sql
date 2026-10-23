-- Recipes get servings, ordered steps, and structured ingredients (one row per ingredient).
-- Existing recipes keep their ingredients as names, in order, and get 1 serving and no steps
-- until they are edited. `npm run db:seed` refreshes the editorial sample recipes.

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "recipe_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" VARCHAR(10),
    "note" VARCHAR(100),

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("recipe_id","position")
);

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Move each old ingredient text into its own row, keeping the order.
INSERT INTO "recipe_ingredients" ("recipe_id", "position", "name")
SELECT r."id", i."ordinality" - 1, LEFT(BTRIM(i."name"), 100)
FROM "recipes" r
CROSS JOIN LATERAL UNNEST(r."ingredients") WITH ORDINALITY AS i("name", "ordinality")
WHERE BTRIM(i."name") <> '';

-- AlterTable: the defaults only fill existing rows, then go away.
ALTER TABLE "recipes" DROP COLUMN "ingredients",
ADD COLUMN     "servings" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "steps" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "recipes" ALTER COLUMN "servings" DROP DEFAULT,
ALTER COLUMN "steps" DROP DEFAULT;
