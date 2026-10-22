import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CursorPage } from '../../common/dto/cursor-pagination-query.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { CreateRecipeDto } from './dto/create-recipe.dto.js';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto.js';
import { UpdateRecipeDto } from './dto/update-recipe.dto.js';
import { recipeSelect, RecipeView } from './recipes.types.js';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  /** `authorId` comes from the verified session, never from the request body. */
  create(dto: CreateRecipeDto, authorId: string): Promise<RecipeView> {
    const { title, description, cuisine, minutes, ingredients } = dto;
    return this.prisma.recipe.create({
      data: { title, description, cuisine, minutes, ingredients, authorId },
      select: recipeSelect,
    });
  }

  async findMany(query: ListRecipesQueryDto): Promise<CursorPage<RecipeView>> {
    const { cursor, limit, search, cuisine } = query;

    // UUIDv7 ids are time-ordered, so `id < cursor` walks from newest to oldest
    // and stays stable while new recipes are inserted.
    const where: Prisma.RecipeWhereInput = {
      id: cursor ? { lt: cursor } : undefined,
      cuisine: cuisine || undefined,
      OR: search
        ? [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    // Fetch one extra row to learn whether another page exists.
    const rows = await this.prisma.recipe.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: recipeSelect,
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  async findOne(id: string): Promise<RecipeView> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: recipeSelect,
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return recipe;
  }

  async update(
    id: string,
    dto: UpdateRecipeDto,
    userId: string,
  ): Promise<RecipeView> {
    await this.assertAuthor(id, userId);
    // If the recipe is deleted meanwhile, Prisma P2025 maps to 404 (PrismaExceptionFilter).
    return this.prisma.recipe.update({
      where: { id },
      data: dto,
      select: recipeSelect,
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.assertAuthor(id, userId);
    await this.prisma.recipe.delete({ where: { id } });
  }

  /**
   * Only a recipe's author may change it. Editorial recipes have no author, so nobody can
   * change them through the API. The author never changes, so this check stays valid.
   */
  private async assertAuthor(id: string, userId: string): Promise<void> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    if (recipe.authorId !== userId) {
      throw new ForbiddenException('Only the recipe author can change it');
    }
  }
}
