import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  recipeSummarySelectFor,
  toRecipeView,
} from '../recipes/recipes.types.js';
import type { IngredientMatch, RecipeMatchView } from './discover.types.js';
import { DiscoverRecipesQueryDto } from './dto/discover-recipes-query.dto.js';

type MatchRow = IngredientMatch & { id: string };

@Injectable()
export class DiscoverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recipes that use at least one of `ingredients`, fewest missing first, then the ones that
   * use more of them, then newest. Names match by ingredient_match_key (see the
   * add_ingredient_match_key migration), so case, accents and plural endings don't matter.
   * `viewerId` only decides `savedByMe`.
   */
  async matchRecipes(
    query: DiscoverRecipesQueryDto,
    viewerId?: string,
  ): Promise<{ data: RecipeMatchView[] }> {
    const { ingredients, cuisine, maxMinutes, maxMissing, limit } = query;

    // `candidates` uses the match_key index to find recipes sharing at least one needed
    // ingredient; only those get their full ingredient lists scored.
    const ranked = await this.prisma.$queryRaw<MatchRow[]>`
      WITH wanted AS (
        SELECT DISTINCT ingredient_match_key(name) AS key
        FROM unnest(${ingredients}::text[]) AS name
      ),
      candidates AS (
        SELECT DISTINCT ri.recipe_id
        FROM recipe_ingredients ri
        JOIN wanted w ON w.key = ri.match_key
        WHERE ri.quantity IS NOT NULL
      ),
      scored AS (
        SELECT
          r.id,
          count(*) FILTER (WHERE ri.quantity IS NOT NULL)::int AS needed,
          count(w.key) FILTER (WHERE ri.quantity IS NOT NULL)::int AS have,
          coalesce(
            array_agg(ri.name ORDER BY ri.position)
              FILTER (WHERE ri.quantity IS NOT NULL AND w.key IS NULL),
            '{}'
          ) AS missing
        FROM candidates c
        JOIN recipes r ON r.id = c.recipe_id
        JOIN recipe_ingredients ri ON ri.recipe_id = r.id
        LEFT JOIN wanted w ON w.key = ri.match_key
        WHERE (${cuisine ?? null}::text IS NULL OR r.cuisine = ${cuisine ?? null}::text)
          AND (${maxMinutes ?? null}::int IS NULL OR r.minutes <= ${maxMinutes ?? null}::int)
        GROUP BY r.id
      )
      SELECT id, have, needed, missing
      FROM scored
      WHERE ${maxMissing ?? null}::int IS NULL
         OR needed - have <= ${maxMissing ?? null}::int
      ORDER BY needed - have ASC, have DESC, id DESC
      LIMIT ${limit}
    `;
    if (ranked.length === 0) {
      return { data: [] };
    }

    const recipes = await this.prisma.recipe.findMany({
      where: { id: { in: ranked.map((row) => row.id) } },
      select: recipeSummarySelectFor(viewerId),
    });
    const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    // A recipe deleted between the two queries is skipped.
    return {
      data: ranked.flatMap(({ id, have, needed, missing }) => {
        const recipe = byId.get(id);
        return recipe
          ? [{ recipe: toRecipeView(recipe), match: { have, needed, missing } }]
          : [];
      }),
    };
  }
}
