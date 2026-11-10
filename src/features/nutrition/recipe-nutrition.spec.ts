import type { UsdaFood } from './nutrition.types.js';
import {
  buildFoodIndex,
  findFood,
  gramsOf,
  recipeNutrition,
  type FoodIndex,
} from './recipe-nutrition.js';
import { DESCRIBING_PHRASES, USDA_FOODS } from './usda-foods.js';

/**
 * The rules of the SQL function ingredient_match_key, for tests only (the service asks the
 * database). The e2e tests check the real function against the real table.
 */
function testKey(name: string): string | null {
  const words = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s\p{P}\p{S}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      let w = word;
      if (w.length > 3 && /[^s]s$/.test(w)) w = w.slice(0, -1);
      if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
      if (w.length > 3 && w.endsWith('y')) w = `${w.slice(0, -1)}i`;
      return w;
    });
  return words.length ? words.join(' ') : null;
}

const keysOf = (texts: readonly string[]) =>
  new Map(texts.map((text) => [text, testKey(text)]));

const realIndex = buildFoodIndex(
  USDA_FOODS,
  DESCRIBING_PHRASES,
  keysOf([...USDA_FOODS.flatMap((food) => food.names), ...DESCRIBING_PHRASES]),
);
const foodFor = (name: string) =>
  findFood(testKey(name), realIndex)?.description ?? null;
const usda = (fdcId: number) => {
  const food = USDA_FOODS.find((candidate) => candidate.fdcId === fdcId);
  if (!food) throw new Error(`No food ${fdcId}`);
  return food;
};

describe('findFood', () => {
  it('matches names whatever their case, accents, punctuation, or plural', () => {
    expect(foodFor('Garlic')).toBe('Garlic, raw');
    expect(foodFor('ONIONS')).toBe('Onions, raw');
    expect(foodFor('chickpeas')).toBe(
      'Chickpeas (garbanzo beans, bengal gram), mature seeds, canned, drained solids',
    );
    expect(foodFor('Jalapeño')).toBeNull();
  });

  it('matches Filipino names', () => {
    expect(foodFor('bawang')).toBe('Garlic, raw');
    expect(foodFor('kangkong')).toBe('Water convolvulus,raw');
    expect(foodFor('patis')).toBe('Sauce, fish, ready-to-serve');
    expect(foodFor('sitaw')).toBe('Yardlong bean, raw');
  });

  it('allows describing words around the name', () => {
    expect(foodFor('large red onions, finely chopped')).toBe('Onions, raw');
    expect(foodFor('boneless, skinless chicken breasts')).toBe(
      'Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw',
    );
    expect(foodFor('bone-in chicken thighs')).toBe(
      'Chicken, broilers or fryers, thigh, meat and skin, raw',
    );
    expect(foodFor('cloves of garlic, minced')).toBe('Garlic, raw');
    expect(foodFor('flat-leaf parsley')).toBe('Parsley, fresh');
  });

  it('prefers the longest name, then the one that comes last', () => {
    expect(foodFor('coconut milk')).toBe(
      'Nuts, coconut milk, raw (liquid expressed from grated meat and water)',
    );
    expect(foodFor('peanut butter')).toBe(
      "Peanut butter, smooth style, with salt (Includes foods for USDA's Food Distribution Program)",
    );
    expect(foodFor('skinless chicken thighs')).toBe(
      'Chicken, broilers or fryers, dark meat, thigh, meat only, raw',
    );
    expect(foodFor('cooked rice')).toBe(
      'Rice, white, long-grain, regular, enriched, cooked',
    );
  });

  it("doesn't count a different food as the one its name contains", () => {
    for (const name of [
      'coconut flour',
      'almond flour',
      'dried mango',
      'dried shrimp',
      'cooked chicken',
      'chili leaves',
      'sweet potato leaves',
      'light coconut milk',
      'powdered milk',
      'beef bones',
      'chicken cubes',
      'salted egg',
      'cold rice',
      'pork stock',
      'salt and pepper',
      'chicken or pork',
    ]) {
      expect({ name, food: foodFor(name) }).toEqual({ name, food: null });
    }
  });

  it('matches nothing in an empty key', () => {
    expect(findFood(null, realIndex)).toBeNull();
  });
});

describe('buildFoodIndex', () => {
  const food = (fdcId: number, names: string[]): UsdaFood => ({
    ...usda(169230),
    fdcId,
    names,
  });

  it('rejects two foods with names of the same key', () => {
    expect(() =>
      buildFoodIndex(
        [food(1, ['tomato']), food(2, ['tomatoes'])],
        [],
        keysOf(['tomato', 'tomatoes']),
      ),
    ).toThrow(
      'Nutrition food names "tomato" and "tomatoes" have the same match key "tomato"',
    );
  });

  it('allows names of one food to share a key', () => {
    const one = food(1, ['tomato', 'tomatoes']);
    expect(
      buildFoodIndex([one], [], keysOf(['tomato', 'tomatoes'])).names,
    ).toEqual([{ words: ['tomato'], food: one }]);
  });

  it('rejects a name with no key', () => {
    expect(() => buildFoodIndex([food(1, ['?!'])], [], keysOf(['?!']))).toThrow(
      'Nutrition food name "?!" has no match key',
    );
  });
});

describe('gramsOf', () => {
  const egg = usda(171287);
  const garlic = usda(169230);
  const oliveOil = usda(171413);
  const chicken = usda(171447);

  it('converts weights', () => {
    expect(gramsOf(250, 'g', chicken)).toBe(250);
    expect(gramsOf(1.5, 'kg', chicken)).toBe(1500);
    expect(gramsOf(1, 'lb', chicken)).toBeCloseTo(453.6, 1);
    expect(gramsOf(4, 'oz', chicken)).toBeCloseTo(113.4, 1);
  });

  it('converts volumes with the food’s USDA weight per volume', () => {
    expect(gramsOf(1, 'tbsp', oliveOil)).toBeCloseTo(13.5, 1);
    expect(gramsOf(1, 'tsp', oliveOil)).toBeCloseTo(4.5, 1);
    expect(gramsOf(1, 'cup', oliveOil)).toBeCloseTo(216, 0);
    expect(gramsOf(100, 'ml', oliveOil)).toBeCloseTo(91.3, 1);
    expect(gramsOf(1, 'pinch', usda(173468))).toBeCloseTo(0.375, 2);
  });

  it('converts counts and other units with USDA portions', () => {
    expect(gramsOf(2, null, egg)).toBe(100);
    expect(gramsOf(3, 'clove', garlic)).toBe(9);
    expect(gramsOf(3, null, garlic)).toBe(9);
    expect(gramsOf(1, 'can', usda(173800))).toBe(253);
    expect(gramsOf(1, 'can', usda(170172))).toBeCloseTo(405.8, 1);
  });

  it('has no weight for a unit the food has no portion for', () => {
    expect(gramsOf(1, 'cup', chicken)).toBeNull();
    expect(gramsOf(2, null, chicken)).toBeNull();
    expect(gramsOf(1, 'clove', egg)).toBeNull();
    expect(gramsOf(1, 'handful', usda(172232))).toBeNull();
  });
});

describe('recipeNutrition', () => {
  const ingredient = (
    name: string,
    quantity: number | null,
    unit: string | null = null,
  ) => ({ name, quantity, unit, matchKey: testKey(name) });
  const nutrition = (
    ingredients: ReturnType<typeof ingredient>[],
    servings = 1,
    index: FoodIndex = realIndex,
  ) => recipeNutrition({ id: 'recipe-1', servings, ingredients }, index);

  it('adds up counted ingredients and divides by servings', () => {
    const result = nutrition(
      [ingredient('chickpeas', 400, 'g'), ingredient('olive oil', 2, 'tbsp')],
      4,
    );
    // 400 g chickpeas: 556 kcal; 27 g olive oil: 238.7 kcal.
    expect(result.total.energyKcal).toBe(795);
    expect(result.perServing.energyKcal).toBe(199);
    expect(result.total.proteinG).toBe(28.2);
    expect(result.total.fatG).toBe(38.1);
    expect(result.total.sodiumMg).toBe(985);
    expect(result.servings).toBe(4);
    expect(result.coverage).toEqual({ counted: 2, total: 2, complete: true });
    expect(result.ingredients[1]).toEqual({
      name: 'olive oil',
      quantity: 2,
      unit: 'tbsp',
      food: { fdcId: 171413, description: 'Oil, olive, salad or cooking' },
      grams: 27,
      counted: true,
      reason: null,
    });
    expect(result.source).toEqual({
      name: 'USDA FoodData Central, SR Legacy (2018)',
      url: 'https://fdc.nal.usda.gov',
    });
  });

  it('lists ingredients it cannot count, with the reason', () => {
    const result = nutrition([
      ingredient('salt', null),
      ingredient('dragon fruit', 1),
      ingredient('basil', 1, 'handful'),
      ingredient('rice', 200, 'g'),
    ]);
    expect(
      result.ingredients.map(({ name, food, grams, counted, reason }) => ({
        name,
        food: food?.fdcId ?? null,
        grams,
        counted,
        reason,
      })),
    ).toEqual([
      {
        name: 'salt',
        food: 173468,
        grams: null,
        counted: false,
        reason: 'no_amount',
      },
      {
        name: 'dragon fruit',
        food: null,
        grams: null,
        counted: false,
        reason: 'unknown_food',
      },
      {
        name: 'basil',
        food: 172232,
        grams: null,
        counted: false,
        reason: 'unknown_unit',
      },
      { name: 'rice', food: 168877, grams: 200, counted: true, reason: null },
    ]);
    expect(result.coverage).toEqual({ counted: 1, total: 4, complete: false });
    expect(result.total.energyKcal).toBe(730);
  });

  it('gives % Daily Value per serving and FDA-style highlights', () => {
    // 300 g chicken breast for 1: 67.5 g protein (135%), 135 mg sodium (6%).
    const result = nutrition([ingredient('chicken breast', 300, 'g')]);
    expect(result.percentDailyValue).toEqual({
      proteinG: 135,
      fatG: 10,
      saturatedFatG: 8,
      carbsG: 0,
      fiberG: 0,
      sodiumMg: 6,
    });
    expect(result.highlights).toEqual([
      {
        nutrient: 'proteinG',
        level: 'high',
        percentDailyValue: 135,
        label: 'High in protein',
      },
    ]);
  });

  it('calls a 10–19% Daily Value of protein or fiber a good source', () => {
    // 60 g chicken breast for 2: 6.75 g protein a serving, 14% of the Daily Value.
    const result = nutrition([ingredient('chicken breast', 60, 'g')], 2);
    expect(result.highlights).toContainEqual({
      nutrient: 'proteinG',
      level: 'good_source',
      percentDailyValue: 14,
      label: 'Good source of protein',
    });
  });

  it('says low only when every ingredient and value is counted', () => {
    const lowFat = [
      ingredient('cucumber', 1),
      ingredient('vinegar', 1, 'tbsp'),
    ];
    expect(nutrition(lowFat).highlights.map((h) => h.label)).toEqual([
      'Low in fat',
      'Low in saturated fat',
      'Low in sodium',
    ]);
    // Salt "to taste" isn't counted, so the sodium could be anything.
    expect(nutrition([...lowFat, ingredient('salt', null)]).highlights).toEqual(
      [],
    );
    // USDA has no sugars value for kangkong; that doesn't affect fat or sodium.
    const withKangkong = nutrition([
      ...lowFat,
      ingredient('kangkong', 100, 'g'),
    ]);
    expect(withKangkong.incompleteNutrients).toEqual(['sugarsG']);
    expect(withKangkong.highlights.map((h) => h.label)).toContain('Low in fat');
  });

  it('says high in sodium and fat when they are', () => {
    const result = nutrition([
      ingredient('soy sauce', 3, 'tbsp'),
      ingredient('pork belly', 250, 'g'),
    ]);
    expect(result.highlights.map((h) => h.label)).toEqual([
      'High in protein',
      'High in fat',
      'High in saturated fat',
      'High in sodium',
    ]);
  });

  it('has no low highlights for a recipe without ingredients', () => {
    const result = nutrition([]);
    expect(result.highlights).toEqual([]);
    expect(result.coverage).toEqual({ counted: 0, total: 0, complete: true });
    expect(result.total.energyKcal).toBe(0);
  });
});
