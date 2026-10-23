import type { RecipeSummaryView } from '../recipes/recipes.types.js';

/**
 * One entry in the signed-in user's saved list: the live original recipe, never a copy. Like
 * other lists, it leaves out `steps`.
 */
export interface SavedRecipeView {
  savedAt: Date;
  recipe: RecipeSummaryView;
}
