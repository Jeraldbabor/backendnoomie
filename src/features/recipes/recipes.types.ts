import type { Prisma } from '../../generated/prisma/client.js';
import type { RecipeIngredientDto } from './dto/recipe-ingredient.dto.js';

/**
 * The recipe fields every response includes, lists too. The author is limited to public
 * profile fields, so an author's email and other account data never appear in recipe responses.
 */
export const recipeSummarySelect = {
  id: true,
  title: true,
  description: true,
  cuisine: true,
  minutes: true,
  servings: true,
  ingredients: {
    select: { name: true, quantity: true, unit: true, note: true },
    orderBy: { position: 'asc' },
  },
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, displayName: true } },
} satisfies Prisma.RecipeSelect;

/** One recipe in full: the summary plus its steps, which lists leave out to stay small. */
export const recipeSelect = {
  ...recipeSummarySelect,
  steps: true,
} satisfies Prisma.RecipeSelect;

// Matches no user (user ids are UUIDv7, never nil), so anonymous viewers have no saves.
const ANONYMOUS_VIEWER = '00000000-0000-0000-0000-000000000000';

/** Whether `viewerId` saved the recipe. Never reveals who else saved it. */
const viewerSave = (viewerId: string | undefined) => ({
  where: { userId: viewerId ?? ANONYMOUS_VIEWER },
  select: { id: true },
  take: 1,
});

/** A full recipe as `viewerId` sees it. Pass undefined for anonymous requests. */
export function recipeSelectFor(viewerId: string | undefined) {
  return {
    ...recipeSelect,
    saves: viewerSave(viewerId),
  } satisfies Prisma.RecipeSelect;
}

/** A recipe in a list as `viewerId` sees it. Pass undefined for anonymous requests. */
export function recipeSummarySelectFor(viewerId: string | undefined) {
  return {
    ...recipeSummarySelect,
    saves: viewerSave(viewerId),
  } satisfies Prisma.RecipeSelect;
}

type RecipeRow = Prisma.RecipeGetPayload<{
  select: ReturnType<typeof recipeSelectFor>;
}>;
type RecipeSummaryRow = Prisma.RecipeGetPayload<{
  select: ReturnType<typeof recipeSummarySelectFor>;
}>;

/** `author` is null for Noomie editorial recipes; `savedByMe` is false when anonymous. */
export type RecipeView = Omit<RecipeRow, 'saves'> & { savedByMe: boolean };
/** A recipe in a list: everything but `steps`. */
export type RecipeSummaryView = Omit<RecipeSummaryRow, 'saves'> & {
  savedByMe: boolean;
};

export function toRecipeView<Row extends { saves: unknown[] }>({
  saves,
  ...recipe
}: Row): Omit<Row, 'saves'> & { savedByMe: boolean } {
  return { ...recipe, savedByMe: saves.length > 0 };
}

/** Rows for `recipe_ingredients`, in the order sent. Empty notes are stored as null. */
export function toIngredientRows(ingredients: RecipeIngredientDto[]) {
  return ingredients.map(({ name, quantity, unit, note }, position) => ({
    position,
    name,
    quantity: quantity ?? null,
    unit: unit ?? null,
    note: note || null,
  }));
}
