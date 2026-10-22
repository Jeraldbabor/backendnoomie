import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service.js';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto.js';
import { RecipesService } from './recipes.service.js';
import {
  recipeSelect,
  recipeSelectFor,
  type RecipeView,
} from './recipes.types.js';

const fields = (id: string) => ({
  id,
  title: `Recipe ${id}`,
  description: null,
  cuisine: 'Mediterranean',
  minutes: 20,
  ingredients: ['lemon'],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  author: { id: 'author-1', displayName: 'Ada' },
});
/** A database row: `saves` holds the viewer's save, if any. */
const row = (id: string, saved = false) => ({
  ...fields(id),
  saves: saved ? [{ id: 'save-1' }] : [],
});
/** What the API returns for that row. */
const view = (id: string, savedByMe = false): RecipeView => ({
  ...fields(id),
  savedByMe,
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

  describe('viewer-specific fields', () => {
    it("only ever looks up the viewer's own save", () => {
      expect(recipeSelectFor('user-1').saves.where).toEqual({
        userId: 'user-1',
      });
    });

    it('matches no saves for anonymous viewers', () => {
      const { userId } = recipeSelectFor(undefined).saves.where;
      expect(userId).toBe('00000000-0000-0000-0000-000000000000');
    });

    it('exposes only public author fields', () => {
      expect(recipeSelect.author.select).toEqual({
        id: true,
        displayName: true,
      });
    });
  });

  describe('create', () => {
    it('sets the author from the signed-in user', async () => {
      prisma.recipe.create.mockResolvedValue(row('new'));
      const dto = {
        title: 'Soup',
        cuisine: 'Test',
        minutes: 10,
        ingredients: ['water'],
      };

      await expect(service.create(dto, 'author-1')).resolves.toEqual(
        view('new'),
      );
      expect(prisma.recipe.create).toHaveBeenCalledWith({
        data: { ...dto, authorId: 'author-1' },
        select: recipeSelectFor('author-1'),
      });
    });
  });

  describe('findMany', () => {
    it('returns a next cursor when more rows exist than the limit', async () => {
      prisma.recipe.findMany.mockResolvedValue([row('c'), row('b'), row('a')]);

      const page = await service.findMany(query({ limit: 2 }));

      expect(page.data.map((r) => r.id)).toEqual(['c', 'b']);
      expect(page.nextCursor).toBe('b');
      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 3,
          orderBy: { id: 'desc' },
          select: recipeSelectFor(undefined),
        }),
      );
    });

    it('returns a null cursor on the last page', async () => {
      prisma.recipe.findMany.mockResolvedValue([row('a')]);

      const page = await service.findMany(query({ limit: 2 }));

      expect(page).toEqual({ data: [view('a')], nextCursor: null });
    });

    it('marks recipes the signed-in viewer saved', async () => {
      prisma.recipe.findMany.mockResolvedValue([row('b', true), row('a')]);

      const page = await service.findMany(query(), 'user-1');

      expect(page.data.map((r) => r.savedByMe)).toEqual([true, false]);
      expect(page.data[0]).not.toHaveProperty('saves');
      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ select: recipeSelectFor('user-1') }),
      );
    });

    it('filters by author for profile pages', async () => {
      prisma.recipe.findMany.mockResolvedValue([]);

      await service.findMany(query({ authorId: 'author-1' }));

      const { where } = prisma.recipe.findMany.mock.calls[0][0];
      expect(where.authorId).toBe('author-1');
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
    it('returns the recipe as the viewer sees it', async () => {
      prisma.recipe.findUnique.mockResolvedValue(row('r1', true));

      await expect(service.findOne('r1', 'user-1')).resolves.toEqual(
        view('r1', true),
      );
    });

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
      prisma.recipe.update.mockResolvedValue(row('r1'));

      await service.update('r1', { minutes: 25 }, 'author-1');
      await service.remove('r1', 'author-1');

      expect(prisma.recipe.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { minutes: 25 },
        select: recipeSelectFor('author-1'),
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
