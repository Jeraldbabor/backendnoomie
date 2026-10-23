import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { PrismaService } from '../../database/prisma.service.js';
import { recipeSummarySelectFor } from '../recipes/recipes.types.js';
import { DiscoverService } from './discover.service.js';
import { DiscoverRecipesQueryDto } from './dto/discover-recipes-query.dto.js';

const recipeRow = (id: string, saved = false) => ({
  id,
  title: `Recipe ${id}`,
  description: null,
  cuisine: 'Test',
  minutes: 10,
  servings: 2,
  ingredients: [{ name: 'rice', quantity: 200, unit: 'g', note: null }],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  photo: null,
  author: null,
  saves: saved ? [{ id: 'save-1' }] : [],
});

const parse = (query: Record<string, unknown>) =>
  plainToInstance(DiscoverRecipesQueryDto, query);

describe('DiscoverRecipesQueryDto', () => {
  it('splits comma-separated and repeated ingredients, trimmed, without blanks', () => {
    expect(parse({ ingredients: ' rice, ,Miso ' }).ingredients).toEqual([
      'rice',
      'Miso',
    ]);
    expect(parse({ ingredients: ['rice', 'egg,miso'] }).ingredients).toEqual([
      'rice',
      'egg',
      'miso',
    ]);
  });

  it('needs at least one ingredient', async () => {
    for (const query of [{}, { ingredients: ' , ' }]) {
      const [error] = await validate(parse(query));
      expect(error.constraints).toEqual({
        arrayMinSize: 'Enter at least one ingredient',
      });
    }
  });

  it('allows at most 30 ingredients', async () => {
    const ingredients = Array.from({ length: 31 }, (_, i) => `item ${i}`);
    const [error] = await validate(parse({ ingredients: ingredients.join() }));
    expect(error.constraints).toEqual({
      arrayMaxSize: 'Enter at most 30 ingredients',
    });
  });
});

describe('DiscoverService', () => {
  const prisma = {
    $queryRaw: vi.fn(),
    recipe: { findMany: vi.fn() },
  };
  let service: DiscoverService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new DiscoverService(prisma as unknown as PrismaService);
  });

  it('keeps the ranking order and attaches each match', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { id: 'b', have: 2, needed: 2, missing: [] },
      { id: 'a', have: 1, needed: 3, missing: ['egg', 'miso'] },
    ]);
    // The database returns rows in any order.
    prisma.recipe.findMany.mockResolvedValue([
      recipeRow('a'),
      recipeRow('b', true),
    ]);

    const { data } = await service.matchRecipes(
      parse({ ingredients: 'rice' }),
      'user-1',
    );

    expect(data.map(({ recipe }) => recipe.id)).toEqual(['b', 'a']);
    expect(data[0].recipe.savedByMe).toBe(true);
    expect(data[0].recipe).not.toHaveProperty('saves');
    expect(data[1].match).toEqual({
      have: 1,
      needed: 3,
      missing: ['egg', 'miso'],
    });
    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['b', 'a'] } },
      select: recipeSummarySelectFor('user-1'),
    });
  });

  it('skips a recipe deleted between ranking and loading', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { id: 'gone', have: 1, needed: 1, missing: [] },
      { id: 'a', have: 1, needed: 2, missing: ['egg'] },
    ]);
    prisma.recipe.findMany.mockResolvedValue([recipeRow('a')]);

    const { data } = await service.matchRecipes(parse({ ingredients: 'rice' }));

    expect(data.map(({ recipe }) => recipe.id)).toEqual(['a']);
  });

  it('skips loading recipes when nothing matches', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await expect(
      service.matchRecipes(parse({ ingredients: 'rice' })),
    ).resolves.toEqual({ data: [] });
    expect(prisma.recipe.findMany).not.toHaveBeenCalled();
  });
});
