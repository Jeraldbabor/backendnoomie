import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service.js';
import type { ImagesService } from '../images/images.service.js';
import { imageSelect } from '../images/images.types.js';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto.js';
import { RecipesService } from './recipes.service.js';
import type { CreateRecipeDto } from './dto/create-recipe.dto.js';
import {
  recipeSelect,
  recipeSelectFor,
  recipeSummarySelect,
  recipeSummarySelectFor,
  type RecipeView,
} from './recipes.types.js';

const fields = (id: string) => ({
  id,
  title: `Recipe ${id}`,
  description: null,
  cuisine: 'Mediterranean',
  minutes: 20,
  servings: 2,
  ingredients: [{ name: 'lemon', quantity: 1, unit: null, note: 'juiced' }],
  steps: ['Squeeze the lemon.'],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});
/** A database row: `saves` holds the viewer's save, if any. */
const row = (id: string, saved = false) => ({
  ...fields(id),
  photo: { id: `photo-${id}`, width: 1600, height: 1200 },
  author: { id: 'author-1', displayName: 'Ada', photo: null },
  saves: saved ? [{ id: 'save-1' }] : [],
});
/** What the API returns for that row: image URLs instead of image rows. */
const view = (id: string, savedByMe = false): RecipeView => ({
  ...fields(id),
  photo: {
    small: `/api/v1/images/photo-${id}/small`,
    large: `/api/v1/images/photo-${id}/large`,
    width: 1600,
    height: 1200,
  },
  author: { id: 'author-1', displayName: 'Ada', photo: null },
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
    $transaction: vi.fn(),
  };
  const images = { create: vi.fn(), delete: vi.fn() };
  let service: RecipesService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new RecipesService(
      prisma as unknown as PrismaService,
      images as unknown as ImagesService,
    );
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
        photo: { select: imageSelect },
      });
    });

    it('lists ingredients in recipe order, and steps only for one recipe', () => {
      expect(recipeSelect.ingredients.orderBy).toEqual({ position: 'asc' });
      expect(recipeSelect.steps).toBe(true);
      expect(recipeSummarySelect).not.toHaveProperty('steps');
    });
  });

  describe('create', () => {
    const dto: CreateRecipeDto = {
      title: 'Soup',
      cuisine: 'Test',
      minutes: 10,
      servings: 2,
      ingredients: [
        { name: 'water', quantity: 500, unit: 'ml' },
        { name: 'salt', note: '' },
      ],
      steps: ['Boil the water.', 'Add salt.'],
    };

    it('sets the author from the signed-in user', async () => {
      prisma.recipe.create.mockResolvedValue(row('new'));

      await expect(service.create(dto, 'author-1')).resolves.toEqual(
        view('new'),
      );
      expect(prisma.recipe.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ authorId: 'author-1' }),
          select: recipeSelectFor('author-1'),
        }),
      );
    });

    it('stores ingredients in the order sent, with blanks as null', async () => {
      prisma.recipe.create.mockResolvedValue(row('new'));

      await service.create(dto, 'author-1');

      const { data } = prisma.recipe.create.mock.calls[0][0];
      expect(data).toMatchObject({ servings: 2, steps: dto.steps });
      expect(data.ingredients).toEqual({
        createMany: {
          data: [
            {
              position: 0,
              name: 'water',
              quantity: 500,
              unit: 'ml',
              note: null,
            },
            {
              position: 1,
              name: 'salt',
              quantity: null,
              unit: null,
              note: null,
            },
          ],
        },
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
          select: recipeSummarySelectFor(undefined),
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
        expect.objectContaining({ select: recipeSummarySelectFor('user-1') }),
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
        data: expect.objectContaining({ minutes: 25, ingredients: undefined }),
        select: recipeSelectFor('author-1'),
      });
      expect(prisma.recipe.delete).toHaveBeenCalledWith({
        where: { id: 'r1' },
      });
    });

    it('replace the whole ingredient list when ingredients are sent', async () => {
      prisma.recipe.findUnique.mockResolvedValue({ authorId: 'author-1' });
      prisma.recipe.update.mockResolvedValue(row('r1'));

      await service.update(
        'r1',
        { ingredients: [{ name: 'lime', quantity: 2 }] },
        'author-1',
      );

      const { data } = prisma.recipe.update.mock.calls[0][0];
      expect(data.ingredients).toEqual({
        deleteMany: {},
        createMany: {
          data: [
            { position: 0, name: 'lime', quantity: 2, unit: null, note: null },
          ],
        },
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

  describe('photos', () => {
    /** A transaction client whose locked recipe row currently has `photoId`. */
    const lockedRow = (photoId: string | null) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([{ photo_id: photoId }]),
        recipe: { update: vi.fn() },
      };
      prisma.$transaction.mockImplementation(
        (run: (client: typeof tx) => unknown) => run(tx),
      );
      return tx;
    };

    it('replace the photo and delete the previous one', async () => {
      prisma.recipe.findUnique
        .mockResolvedValueOnce({ authorId: 'author-1', photoId: 'img-old' })
        .mockResolvedValueOnce(row('r1'));
      images.create.mockResolvedValue({ id: 'img-new', width: 1, height: 1 });
      const tx = lockedRow('img-old');
      const data = Buffer.from('jpeg');

      await expect(service.setPhoto('r1', data, 'author-1')).resolves.toEqual(
        view('r1'),
      );

      expect(images.create).toHaveBeenCalledWith('author-1', 'recipe', data);
      expect(tx.recipe.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { photoId: 'img-new' },
      });
      expect(images.delete).toHaveBeenCalledWith(['img-old']);
    });

    it('delete the new image when attaching it fails', async () => {
      prisma.recipe.findUnique.mockResolvedValue({
        authorId: 'author-1',
        photoId: null,
      });
      images.create.mockResolvedValue({ id: 'img-new', width: 1, height: 1 });
      prisma.$transaction.mockRejectedValue(new NotFoundException());

      await expect(
        service.setPhoto('r1', Buffer.from('jpeg'), 'author-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(images.delete).toHaveBeenCalledWith(['img-new']);
    });

    it('refuse other users before storing anything', async () => {
      prisma.recipe.findUnique.mockResolvedValue({
        authorId: 'author-1',
        photoId: null,
      });

      await expect(
        service.setPhoto('r1', Buffer.from('jpeg'), 'someone-else'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(images.create).not.toHaveBeenCalled();
    });

    it('remove the photo', async () => {
      prisma.recipe.findUnique.mockResolvedValue({
        authorId: 'author-1',
        photoId: 'img-old',
      });
      const tx = lockedRow('img-old');

      await service.removePhoto('r1', 'author-1');

      expect(tx.recipe.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { photoId: null },
      });
      expect(images.delete).toHaveBeenCalledWith(['img-old']);
    });

    it('go with the recipe when it is deleted', async () => {
      prisma.recipe.findUnique.mockResolvedValue({
        authorId: 'author-1',
        photoId: 'img-1',
      });

      await service.remove('r1', 'author-1');

      expect(prisma.recipe.delete).toHaveBeenCalledWith({
        where: { id: 'r1' },
      });
      expect(images.delete).toHaveBeenCalledWith(['img-1']);
    });
  });
});
