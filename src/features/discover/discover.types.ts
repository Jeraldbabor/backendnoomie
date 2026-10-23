import type { RecipeSummaryView } from '../recipes/recipes.types.js';

/**
 * How a recipe matches what the user has. Ingredients without a quantity ("salt, to taste")
 * are optional and left out of all three numbers.
 */
export interface IngredientMatch {
  /** Needed ingredients the user has. */
  have: number;
  /** Ingredients with a quantity. */
  needed: number;
  /** Names of needed ingredients the user doesn't have, in recipe order. */
  missing: string[];
}

/** One Discover result: the recipe as in other lists (no steps), and how it matches. */
export interface RecipeMatchView {
  recipe: RecipeSummaryView;
  match: IngredientMatch;
}
