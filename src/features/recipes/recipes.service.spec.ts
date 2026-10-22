import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service.js';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto.js';
import { RecipesService } from './recipes.service.js';
import { recipeSelect, type RecipeView } from './recipes.types.js';

const recipe = (id: string): RecipeView => ({
  id,
  title: `Recipe ${id}`,
  description: null,
  cuisine: 'Mediterranean',
  minutes: 20,
  ingredients: ['lemon'],
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { id: 'author-1', displayName: 'Ada' },
});

const query = (overrides: Partial<ListRecipesQueryDto> = {}) =>
  Object.assign(new ListRecipesQueryDto(), overrides);

describe('RecipesService', () => {
  const prisma = {
    recipe: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  let service: RecipesService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new RecipesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('sets the author from the signed-in user and returns public fields only', async () => {
      prisma.recipe.create.mockResolvedValue(recipe('new'));
      const dto = {
        title: 'Soup',
        cuisine: 'Test',
        minutes: 10,
        ingredients: ['water'],
      };

      await service.create(dto, 'author-1');

      expect(prisma.recipe.create).toHaveBeenCalledWith({
        data: { ...dto, authorId: 'author-1' },
        select: recipeSelect,
      });
      expect(recipeSelect.author.select).toEqual({
        id: true,
        displayName: true,
      });
    });
  });

  describe('findMany', () => {
    it('returns a next cursor when more rows exist than the limit', async () => {
      prisma.recipe.findMany.mockResolvedValue([
        recipe('c'),
        recipe('b'),
        recipe('a'),
      ]);

      const page = await service.findMany(query({ limit: 2 }));

      expect(page.data.map((r) => r.id)).toEqual(['c', 'b']);
      expect(page.nextCursor).toBe('b');
      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 3,
          orderBy: { id: 'desc' },
          select: recipeSelect,
        }),
      );
    });

    it('returns a null cursor on the last page', async () => {
      prisma.recipe.findMany.mockResolvedValue([recipe('a')]);

      const page = await service.findMany(query({ limit: 2 }));

      expect(page).toEqual({ data: [recipe('a')], nextCursor: null });
    });

    it('applies cursor, cuisine and search filters', async () => {
      prisma.recipe.findMany.mockResolvedValue([]);

      await service.findMany(
        query({
          cursor: 'cursor-id',
          cuisine: 'Mediterranean',
          search: 'lemon',
        }),
      );

      const { where } = prisma.recipe.findMany.mock.calls[0][0];
      expect(where).toEqual({
        id: { lt: 'cursor-id' },
        cuisine: 'Mediterranean',
        OR: [
          { title: { contains: 'lemon', mode: 'insensitive' } },
          { description: { contains: 'lemon', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the recipe does not exist', async () => {
      prisma.recipe.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update and remove', () => {
    it('let the author change their recipe', async () => {
      prisma.recipe.findUnique.mockResolvedValue({ authorId: 'author-1' });
      prisma.recipe.update.mockResolvedValue(recipe('r1'));

      await service.update('r1', { minutes: 25 }, 'author-1');
      await service.remove('r1', 'author-1');

      expect(prisma.recipe.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { minutes: 25 },
        select: recipeSelect,
      });
      expect(prisma.recipe.delete).toHaveBeenCalledWith({
        where: { id: 'r1' },
      });
    });

    it('forbid other users without touching the recipe', async () => {
      prisma.recipe.findUnique.mockResolvedValue({ authorId: 'author-1' });

      await expect(
        service.update('r1', { minutes: 25 }, 'someone-else'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.remove('r1', 'someone-else')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.recipe.update).not.toHaveBeenCalled();
      expect(prisma.recipe.delete).not.toHaveBeenCalled();
    });

    it('keep editorial recipes (no author) read-only for everyone', async () => {
      prisma.recipe.findUnique.mockResolvedValue({ authorId: null });

      await expect(
        service.update('r1', { minutes: 25 }, 'author-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('report a missing recipe as not found', async () => {
      prisma.recipe.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('missing', 'author-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
