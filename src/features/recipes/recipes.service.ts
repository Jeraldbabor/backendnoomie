import { Injectable, NotFoundException } from '@nestjs/common';
import { CursorPage } from '../../common/dto/cursor-pagination-query.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma, Recipe } from '../../generated/prisma/client.js';
import { CreateRecipeDto } from './dto/create-recipe.dto.js';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto.js';
import { UpdateRecipeDto } from './dto/update-recipe.dto.js';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRecipeDto): Promise<Recipe> {
    return this.prisma.recipe.create({ data: dto });
  }

  async findMany(query: ListRecipesQueryDto): Promise<CursorPage<Recipe>> {
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
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  async findOne(id: string): Promise<Recipe> {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return recipe;
  }

  update(id: string, dto: UpdateRecipeDto): Promise<Recipe> {
    // A missing id raises Prisma P2025, which PrismaExceptionFilter maps to 404.
    return this.prisma.recipe.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.recipe.delete({ where: { id } });
  }
}
