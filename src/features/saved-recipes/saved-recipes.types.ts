import type { RecipeView } from '../recipes/recipes.types.js';

/** One entry in the signed-in user's saved list: the live original recipe, never a copy. */
export interface SavedRecipeView {
  savedAt: Date;
  recipe: RecipeView;
}
