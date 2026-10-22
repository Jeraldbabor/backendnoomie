import type { Prisma } from '../../generated/prisma/client.js';

/**
 * The recipe fields every response includes. The author is limited to public profile fields,
 * so an author's email and other account data never appear in recipe responses.
 */
export const recipeSelect = {
  id: true,
  title: true,
  description: true,
  cuisine: true,
  minutes: true,
  ingredients: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, displayName: true } },
} satisfies Prisma.RecipeSelect;

// Matches no user (user ids are UUIDv7, never nil), so anonymous viewers have no saves.
const ANONYMOUS_VIEWER = '00000000-0000-0000-0000-000000000000';

/**
 * Selects a recipe as `viewerId` sees it: the public fields plus whether that viewer saved
 * it. Pass undefined for anonymous requests. Never reveals who else saved it.
 */
export function recipeSelectFor(viewerId: string | undefined) {
  return {
    ...recipeSelect,
    saves: {
      where: { userId: viewerId ?? ANONYMOUS_VIEWER },
      select: { id: true },
      take: 1,
    },
  } satisfies Prisma.RecipeSelect;
}

type RecipeRow = Prisma.RecipeGetPayload<{
  select: ReturnType<typeof recipeSelectFor>;
}>;

/** `author` is null for Noomie editorial recipes; `savedByMe` is false when anonymous. */
export type RecipeView = Omit<RecipeRow, 'saves'> & { savedByMe: boolean };

export function toRecipeView({ saves, ...recipe }: RecipeRow): RecipeView {
  return { ...recipe, savedByMe: saves.length > 0 };
}
