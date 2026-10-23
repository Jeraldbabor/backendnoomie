import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CursorPage,
  CursorPaginationQueryDto,
} from '../../common/dto/cursor-pagination-query.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  recipeSummarySelectFor,
  toRecipeView,
} from '../recipes/recipes.types.js';
import type { SavedRecipeView } from './saved-recipes.types.js';

/** Every method acts on the signed-in user's own saves; there is no way to read others'. */
@Injectable()
export class SavedRecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: CursorPaginationQueryDto,
  ): Promise<CursorPage<SavedRecipeView>> {
    const { cursor, limit } = query;
    // Save ids are UUIDv7, so `id < cursor` pages from the most recently saved.
    const rows = await this.prisma.savedRecipe.findMany({
      where: { userId, id: cursor ? { lt: cursor } : undefined },
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        savedAt: true,
        recipe: { select: recipeSummarySelectFor(userId) },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      data: page.map(({ savedAt, recipe }) => ({
        savedAt,
        recipe: toRecipeView(recipe),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /** Saving twice is a no-op that keeps the original save time. */
  async save(userId: string, recipeId: string): Promise<void> {
    try {
      await this.prisma.savedRecipe.upsert({
        where: { userId_recipeId: { userId, recipeId } },
        create: { userId, recipeId },
        update: {},
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2003: the recipe doesn't exist (foreign key). P2002: a concurrent save won.
        if (error.code === 'P2003') {
          throw new NotFoundException(`Recipe ${recipeId} not found`);
        }
        if (error.code === 'P2002') {
          return;
        }
      }
      throw error;
    }
  }

  /** Unsaving something that isn't saved is a no-op. */
  async unsave(userId: string, recipeId: string): Promise<void> {
    await this.prisma.savedRecipe.deleteMany({ where: { userId, recipeId } });
  }
}
