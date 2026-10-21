import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service.js';
import type { Recipe } from '../../generated/prisma/client.js';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto.js';
import { RecipesService } from './recipes.service.js';

const recipe = (id: string): Recipe => ({
  id,
  title: `Recipe ${id}`,
  description: null,
  cuisine: 'Mediterranean',
  minutes: 20,
  ingredients: ['lemon'],
  createdAt: new Date(),
  updatedAt: new Date(),
});

const query = (overrides: Partial<ListRecipesQueryDto> = {}) =>
  Object.assign(new ListRecipesQueryDto(), overrides);

describe('RecipesService', () => {
  const prisma = {
    recipe: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  let service: RecipesService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new RecipesService(prisma as unknown as PrismaService);
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
        expect.objectContaining({ take: 3, orderBy: { id: 'desc' } }),
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
});
