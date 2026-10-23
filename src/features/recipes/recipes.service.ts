import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CursorPage } from '../../common/dto/cursor-pagination-query.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ImagesService } from '../images/images.service.js';
import { CreateRecipeDto } from './dto/create-recipe.dto.js';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto.js';
import { UpdateRecipeDto } from './dto/update-recipe.dto.js';
import {
  recipeSelectFor,
  recipeSummarySelectFor,
  RecipeSummaryView,
  RecipeView,
  toIngredientRows,
  toRecipeView,
} from './recipes.types.js';

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImagesService,
  ) {}

  /** `authorId` comes from the verified session, never from the request body. */
  async create(dto: CreateRecipeDto, authorId: string): Promise<RecipeView> {
    const { title, description, cuisine, minutes, servings, steps } = dto;
    const recipe = await this.prisma.recipe.create({
      data: {
        title,
        description,
        cuisine,
        minutes,
        servings,
        steps,
        authorId,
        ingredients: {
          createMany: { data: toIngredientRows(dto.ingredients) },
        },
      },
      select: recipeSelectFor(authorId),
    });
    return toRecipeView(recipe);
  }

  /**
   * Lists leave out `steps`. `viewerId` is the signed-in user, if any; it only decides
   * `savedByMe`.
   */
  async findMany(
    query: ListRecipesQueryDto,
    viewerId?: string,
  ): Promise<CursorPage<RecipeSummaryView>> {
    const { cursor, limit, search, cuisine, authorId } = query;

    // UUIDv7 ids are time-ordered, so `id < cursor` walks from newest to oldest
    // and stays stable while new recipes are inserted.
    const where: Prisma.RecipeWhereInput = {
      id: cursor ? { lt: cursor } : undefined,
      cuisine: cuisine || undefined,
      authorId: authorId || undefined,
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
      select: recipeSummarySelectFor(viewerId),
    });

    const hasMore = rows.length > limit;
    const data = (hasMore ? rows.slice(0, limit) : rows).map(toRecipeView);
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }

  async findOne(id: string, viewerId?: string): Promise<RecipeView> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: recipeSelectFor(viewerId),
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return toRecipeView(recipe);
  }

  async update(
    id: string,
    dto: UpdateRecipeDto,
    userId: string,
  ): Promise<RecipeView> {
    await this.assertAuthor(id, userId);
    const { title, description, cuisine, minutes, servings, steps } = dto;
    // If the recipe is deleted meanwhile, Prisma P2025 maps to 404 (PrismaExceptionFilter).
    // Sent ingredients replace the whole list, in the same statement as the other fields.
    const recipe = await this.prisma.recipe.update({
      where: { id },
      data: {
        title,
        description,
        cuisine,
        minutes,
        servings,
        steps,
        ingredients: dto.ingredients && {
          deleteMany: {},
          createMany: { data: toIngredientRows(dto.ingredients) },
        },
      },
      select: recipeSelectFor(userId),
    });
    return toRecipeView(recipe);
  }

  /** Deletes the recipe and its photo. */
  async remove(id: string, userId: string): Promise<void> {
    const { photoId } = await this.assertAuthor(id, userId);
    await this.prisma.recipe.delete({ where: { id } });
    await this.images.delete([photoId]);
  }

  /** Sets or replaces the recipe's photo; the previous one is deleted. */
  async setPhoto(
    id: string,
    data: Buffer,
    userId: string,
  ): Promise<RecipeView> {
    await this.assertAuthor(id, userId);
    const image = await this.images.create(userId, 'recipe', data);
    let previous: string | null;
    try {
      previous = await this.swapPhoto(id, image.id);
    } catch (error) {
      await this.images.delete([image.id]);
      throw error;
    }
    await this.images.delete([previous]);
    return this.findOne(id, userId);
  }

  /** Removes the recipe's photo. Safe to repeat. */
  async removePhoto(id: string, userId: string): Promise<void> {
    await this.assertAuthor(id, userId);
    await this.images.delete([await this.swapPhoto(id, null)]);
  }

  /**
   * Points the recipe at `photoId` and returns the photo it replaced. The row is locked, so
   * two uploads at once can't both replace the same photo and leave one image unreferenced.
   */
  private swapPhoto(
    id: string,
    photoId: string | null,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ photo_id: string | null }[]>`
        SELECT photo_id FROM recipes WHERE id = ${id}::uuid FOR UPDATE`;
      if (!row) {
        throw new NotFoundException(`Recipe ${id} not found`);
      }
      await tx.recipe.update({ where: { id }, data: { photoId } });
      return row.photo_id;
    });
  }

  /**
   * Only a recipe's author may change it. Editorial recipes have no author, so nobody can
   * change them through the API. The author never changes, so this check stays valid.
   */
  private async assertAuthor(
    id: string,
    userId: string,
  ): Promise<{ photoId: string | null }> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      select: { authorId: true, photoId: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    if (recipe.authorId !== userId) {
      throw new ForbiddenException('Only the recipe author can change it');
    }
    return { photoId: recipe.photoId };
  }
}
