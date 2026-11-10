import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service.js';
import { NutritionService } from './nutrition.service.js';

/** Lowercase only: enough for these names, which have no plural or accent to strip. */
const keyRows = (texts: string[]) =>
  texts.map((text) => ({ text, key: text.toLowerCase() }));

describe('NutritionService', () => {
  const prisma = {
    $queryRaw: vi.fn(),
    recipe: { findUnique: vi.fn() },
  };
  const service = new NutritionService(prisma as unknown as PrismaService);
  const recipe = {
    id: 'recipe-1',
    servings: 2,
    ingredients: [
      { name: 'Garlic', quantity: 4, unit: 'clove', matchKey: 'garlic' },
    ],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // Each test starts with no index built.
    (service as unknown as { index: undefined }).index = undefined;
    prisma.$queryRaw.mockImplementation(
      (_sql: TemplateStringsArray, texts: string[]) =>
        Promise.resolve(keyRows(texts)),
    );
  });

  it("reads the recipe's ingredients in order and returns its nutrition", async () => {
    prisma.recipe.findUnique.mockResolvedValue(recipe);

    const result = await service.forRecipe('recipe-1');

    expect(prisma.recipe.findUnique).toHaveBeenCalledWith({
      where: { id: 'recipe-1' },
      select: {
        id: true,
        servings: true,
        ingredients: {
          select: { name: true, quantity: true, unit: true, matchKey: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    expect(result.ingredients[0]).toMatchObject({
      name: 'Garlic',
      food: { fdcId: 169230, description: 'Garlic, raw' },
      grams: 12,
      counted: true,
    });
    // 12 g garlic at 149 kcal per 100 g, for 2 servings.
    expect(result.perServing.energyKcal).toBe(9);
  });

  it('asks the database for match keys once, on first use', async () => {
    prisma.recipe.findUnique.mockResolvedValue(recipe);

    await service.forRecipe('recipe-1');
    await service.forRecipe('recipe-1');

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const texts = prisma.$queryRaw.mock.calls[0][1] as string[];
    expect(texts).toEqual(
      expect.arrayContaining(['garlic', 'bawang', 'chopped']),
    );
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('tries again after the match keys fail to load', async () => {
    prisma.recipe.findUnique.mockResolvedValue(recipe);
    prisma.$queryRaw.mockRejectedValueOnce(new Error('database down'));

    await expect(service.forRecipe('recipe-1')).rejects.toThrow(
      'database down',
    );
    await expect(service.forRecipe('recipe-1')).resolves.toMatchObject({
      recipeId: 'recipe-1',
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('is not found for a recipe that does not exist', async () => {
    prisma.recipe.findUnique.mockResolvedValue(null);

    await expect(service.forRecipe('missing')).rejects.toThrow(
      new NotFoundException('Recipe missing not found'),
    );
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
