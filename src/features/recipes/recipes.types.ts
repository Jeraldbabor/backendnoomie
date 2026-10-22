import type { Prisma } from '../../generated/prisma/client.js';

/**
 * The recipe fields the API returns. The author is limited to public profile fields, so an
 * author's email and other account data never appear in recipe responses.
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

/** `author` is null for Noomie editorial recipes. */
export type RecipeView = Prisma.RecipeGetPayload<{
  select: typeof recipeSelect;
}>;
