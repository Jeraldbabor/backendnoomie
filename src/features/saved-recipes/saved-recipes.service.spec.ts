import { NotFoundException } from '@nestjs/common';
import { CursorPaginationQueryDto } from '../../common/dto/cursor-pagination-query.dto.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { recipeSelectFor } from '../recipes/recipes.types.js';
import { SavedRecipesService } from './saved-recipes.service.js';

const savedAt = new Date('2026-02-01T00:00:00Z');
const savedRow = (id: string) => ({
  id,
  savedAt,
  recipe: {
    id: `recipe-${id}`,
    title: 'Soup',
    description: null,
    cuisine: 'Test',
    minutes: 10,
    ingredients: ['water'],
    createdAt: savedAt,
    updatedAt: savedAt,
    author: { id: 'author-1', displayName: 'Ada' },
    saves: [{ id }],
  },
});
const page = (overrides: Partial<CursorPaginationQueryDto> = {}) =>
  Object.assign(new CursorPaginationQueryDto(), overrides);
const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('failed', {
    code,
    clientVersion: 'test',
  });

describe('SavedRecipesService', () => {
  const prisma = {
    savedRecipe: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  };
  let service: SavedRecipesService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new SavedRecipesService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it("reads only the user's own saves, newest first, with the live recipe", async () => {
      prisma.savedRecipe.findMany.mockResolvedValue([
        savedRow('s3'),
        savedRow('s2'),
        savedRow('s1'),
      ]);

      const result = await service.list('user-1', page({ limit: 2 }));

      expect(prisma.savedRecipe.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: undefined },
        orderBy: { id: 'desc' },
        take: 3,
        select: {
          id: true,
          savedAt: true,
          recipe: { select: recipeSelectFor('user-1') },
        },
      });
      expect(result.nextCursor).toBe('s2');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        savedAt,
        recipe: expect.objectContaining({
          id: 'recipe-s3',
          author: { id: 'author-1', displayName: 'Ada' },
          savedByMe: true,
        }),
      });
      expect(result.data[0].recipe).not.toHaveProperty('saves');
    });

    it('continues after the cursor', async () => {
      prisma.savedRecipe.findMany.mockResolvedValue([savedRow('s1')]);

      const result = await service.list('user-1', page({ cursor: 's2' }));

      expect(prisma.savedRecipe.findMany.mock.calls[0][0].where).toEqual({
        userId: 'user-1',
        id: { lt: 's2' },
      });
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('save', () => {
    it('saves once and keeps the original save on repeats', async () => {
      await service.save('user-1', 'recipe-1');

      expect(prisma.savedRecipe.upsert).toHaveBeenCalledWith({
        where: { userId_recipeId: { userId: 'user-1', recipeId: 'recipe-1' } },
        create: { userId: 'user-1', recipeId: 'recipe-1' },
        update: {},
      });
    });

    it('reports a missing recipe as not found', async () => {
      prisma.savedRecipe.upsert.mockRejectedValue(prismaError('P2003'));

      await expect(service.save('user-1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('treats losing a race with a concurrent save as success', async () => {
      prisma.savedRecipe.upsert.mockRejectedValue(prismaError('P2002'));

      await expect(service.save('user-1', 'recipe-1')).resolves.toBeUndefined();
    });

    it('rethrows anything else', async () => {
      prisma.savedRecipe.upsert.mockRejectedValue(new Error('database down'));

      await expect(service.save('user-1', 'recipe-1')).rejects.toThrow(
        'database down',
      );
    });
  });

  describe('unsave', () => {
    it("removes only the user's own save, and is fine if there is none", async () => {
      prisma.savedRecipe.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.unsave('user-1', 'recipe-1'),
      ).resolves.toBeUndefined();
      expect(prisma.savedRecipe.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', recipeId: 'recipe-1' },
      });
    });
  });
});
