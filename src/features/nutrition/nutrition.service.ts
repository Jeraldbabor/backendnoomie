import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { RecipeNutrition } from './nutrition.types.js';
import {
  buildFoodIndex,
  recipeNutrition,
  type FoodIndex,
} from './recipe-nutrition.js';
import { DESCRIBING_PHRASES, USDA_FOODS } from './usda-foods.js';

@Injectable()
export class NutritionService {
  private index: Promise<FoodIndex> | undefined;

  constructor(private readonly prisma: PrismaService) {}

  /** Nutrition of a recipe, estimated from its ingredients. Public, like the recipe. */
  async forRecipe(recipeId: string): Promise<RecipeNutrition> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: {
        id: true,
        servings: true,
        ingredients: {
          select: { name: true, quantity: true, unit: true, matchKey: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!recipe) throw new NotFoundException(`Recipe ${recipeId} not found`);
    return recipeNutrition(recipe, await this.foodIndex());
  }

  /**
   * Food names get their match keys from the database's ingredient_match_key, the function
   * that fills recipe_ingredients.match_key, so both sides always use the same rules. Built
   * once, on first use; a failed build is retried on the next request.
   */
  private foodIndex(): Promise<FoodIndex> {
    this.index ??= this.loadFoodIndex().catch((error: unknown) => {
      this.index = undefined;
      throw error;
    });
    return this.index;
  }

  private async loadFoodIndex(): Promise<FoodIndex> {
    const texts = [
      ...new Set([
        ...USDA_FOODS.flatMap((food) => food.names),
        ...DESCRIBING_PHRASES,
      ]),
    ];
    const rows = await this.prisma.$queryRaw<
      { text: string; key: string | null }[]
    >`
      SELECT t.text, ingredient_match_key(t.text) AS key
      FROM unnest(${texts}::text[]) AS t(text)
    `;
    return buildFoodIndex(
      USDA_FOODS,
      DESCRIBING_PHRASES,
      new Map(rows.map(({ text, key }) => [text, key])),
    );
  }
}
