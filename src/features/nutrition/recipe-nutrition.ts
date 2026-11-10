import {
  DAILY_VALUE_KEYS,
  NUTRIENT_KEYS,
  type DailyValueKey,
  type IngredientNutrition,
  type NotCountedReason,
  type NutrientKey,
  type Nutrients,
  type NutritionHighlight,
  type PortionUnit,
  type RecipeNutrition,
  type UsdaFood,
} from './nutrition.types.js';

/**
 * Matches ingredient names to USDA foods. Built from the match keys (SQL function
 * ingredient_match_key, the one Discover uses) of every food name and describing phrase.
 */
export interface FoodIndex {
  /** Food names as match-key words, longest first. */
  names: { words: string[]; food: UsdaFood }[];
  /** Describing phrases as match-key words, longest first. */
  phrases: string[][];
}

/**
 * Builds the index. `keyOf` gives each name's and phrase's match key. Throws when two
 * different foods share a key, since a name could then match either.
 */
export function buildFoodIndex(
  foods: readonly UsdaFood[],
  phrases: readonly string[],
  keyOf: ReadonlyMap<string, string | null>,
): FoodIndex {
  const byKey = new Map<string, { name: string; food: UsdaFood }>();
  for (const food of foods) {
    for (const name of food.names) {
      const key = keyOf.get(name);
      if (!key)
        throw new Error(`Nutrition food name "${name}" has no match key`);
      const other = byKey.get(key);
      if (other && other.food !== food) {
        throw new Error(
          `Nutrition food names "${other.name}" and "${name}" have the same match key "${key}"`,
        );
      }
      byKey.set(key, { name, food });
    }
  }
  const longestFirst = (a: string[], b: string[]) => b.length - a.length;
  return {
    names: [...byKey]
      .map(([key, { food }]) => ({ words: key.split(' '), food }))
      .sort((a, b) => longestFirst(a.words, b.words)),
    phrases: phrases
      .map((phrase) => keyOf.get(phrase))
      .filter((key): key is string => !!key)
      .map((key) => key.split(' '))
      .sort(longestFirst),
  };
}

const startsWith = (words: string[], at: number, part: string[]) =>
  part.every((word, i) => words[at + i] === word);

/** Whether describing phrases cover words[from, to) exactly. */
function onlyDescribes(
  words: string[],
  from: number,
  to: number,
  phrases: string[][],
): boolean {
  if (from === to) return true;
  return phrases.some(
    (phrase) =>
      from + phrase.length <= to &&
      startsWith(words, from, phrase) &&
      onlyDescribes(words, from + phrase.length, to, phrases),
  );
}

/**
 * The food an ingredient is, from its match key: the longest food name in it (the last one
 * on a tie, since English puts the food after its describing words: "rice vinegar" is a
 * vinegar), if every other word only describes it. Otherwise null, so "coconut flour" isn't
 * counted as flour.
 */
export function findFood(
  matchKey: string | null,
  index: FoodIndex,
): UsdaFood | null {
  if (!matchKey) return null;
  const words = matchKey.split(' ');
  let best: { at: number; length: number; food: UsdaFood } | undefined;
  for (const { words: name, food } of index.names) {
    if (best && name.length < best.length) break;
    for (let at = words.length - name.length; at >= 0; at--) {
      if (startsWith(words, at, name)) {
        if (!best || at > best.at) best = { at, length: name.length, food };
        break;
      }
    }
  }
  if (!best) return null;
  const end = best.at + best.length;
  return onlyDescribes(words, 0, best.at, index.phrases) &&
    onlyDescribes(words, end, words.length, index.phrases)
    ? best.food
    : null;
}

const GRAMS_PER: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
};
/** US measures, as USDA portions use. A pinch is 1/16 teaspoon. */
const ML_PER: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892159375,
  tbsp: 14.78676478125,
  cup: 236.5882365,
  pinch: 4.92892159375 / 16,
};
const PORTION_UNITS = new Set<string>(['clove', 'slice', 'can', 'bunch']);

/** The weight of `quantity` `unit` of `food`, or null when the unit has no known weight. */
export function gramsOf(
  quantity: number,
  unit: string | null,
  food: UsdaFood,
): number | null {
  if (unit === null) {
    return food.gramsPer.each === undefined
      ? null
      : quantity * food.gramsPer.each;
  }
  if (Object.hasOwn(GRAMS_PER, unit)) return quantity * GRAMS_PER[unit];
  if (Object.hasOwn(ML_PER, unit)) {
    return food.gramsPerMl === null
      ? null
      : quantity * ML_PER[unit] * food.gramsPerMl;
  }
  if (PORTION_UNITS.has(unit)) {
    const grams = food.gramsPer[unit as PortionUnit];
    return grams === undefined ? null : quantity * grams;
  }
  return null;
}

/** FDA Daily Values for adults and children 4 and older (21 CFR 101.9). */
const DAILY_VALUE: Record<DailyValueKey, number> = {
  proteinG: 50,
  fatG: 78,
  saturatedFatG: 20,
  carbsG: 275,
  fiberG: 28,
  sodiumMg: 2300,
};

/**
 * Highlights follow FDA guidance on % Daily Value per serving: 20% or more is high and 5% or
 * less is low, and 10–19% of a nutrient to get more of is a good source. Protein and fiber
 * can be high or a good source; fat, saturated fat, and sodium can be high or low.
 */
const HIGHLIGHTS: {
  nutrient: DailyValueKey;
  name: string;
  levels: NutritionHighlight['level'][];
}[] = [
  { nutrient: 'proteinG', name: 'protein', levels: ['high', 'good_source'] },
  { nutrient: 'fiberG', name: 'fiber', levels: ['high', 'good_source'] },
  { nutrient: 'fatG', name: 'fat', levels: ['high', 'low'] },
  { nutrient: 'saturatedFatG', name: 'saturated fat', levels: ['high', 'low'] },
  { nutrient: 'sodiumMg', name: 'sodium', levels: ['high', 'low'] },
];

const LABEL: Record<NutritionHighlight['level'], (name: string) => string> = {
  high: (name) => `High in ${name}`,
  good_source: (name) => `Good source of ${name}`,
  low: (name) => `Low in ${name}`,
};

function levelOf(
  percent: number,
  levels: NutritionHighlight['level'][],
  canBeLow: boolean,
): NutritionHighlight['level'] | null {
  if (percent >= 20) return 'high';
  if (percent >= 10 && levels.includes('good_source')) return 'good_source';
  if (percent <= 5 && levels.includes('low') && canBeLow) return 'low';
  return null;
}

const roundNutrients = (values: Nutrients): Nutrients =>
  Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [
      key,
      key === 'energyKcal' || key === 'sodiumMg'
        ? Math.round(values[key])
        : Math.round(values[key] * 10) / 10,
    ]),
  ) as Nutrients;

export interface RecipeForNutrition {
  id: string;
  servings: number;
  ingredients: {
    name: string;
    quantity: number | null;
    unit: string | null;
    matchKey: string | null;
  }[];
}

export const NUTRITION_SOURCE = {
  name: 'USDA FoodData Central, SR Legacy (2018)',
  url: 'https://fdc.nal.usda.gov',
};

/**
 * A recipe's nutrition, estimated from its ingredients as bought. Ingredients without an
 * amount, a known food, or a known weight for their unit are listed but not counted.
 */
export function recipeNutrition(
  recipe: RecipeForNutrition,
  index: FoodIndex,
): RecipeNutrition {
  const total = Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [key, 0]),
  ) as Nutrients;
  const incomplete = new Set<NutrientKey>();

  const ingredients = recipe.ingredients.map(
    ({ name, quantity, unit, matchKey }): IngredientNutrition => {
      const food = findFood(matchKey, index);
      const grams =
        food && quantity !== null ? gramsOf(quantity, unit, food) : null;
      const reason: NotCountedReason | null =
        quantity === null
          ? 'no_amount'
          : !food
            ? 'unknown_food'
            : grams === null
              ? 'unknown_unit'
              : null;
      if (food && grams !== null) {
        for (const key of NUTRIENT_KEYS) {
          const per100g = food.per100g[key];
          if (per100g === null) incomplete.add(key);
          else total[key] += (per100g * grams) / 100;
        }
      }
      return {
        name,
        quantity,
        unit,
        food: food && { fdcId: food.fdcId, description: food.description },
        grams: grams === null ? null : Math.round(grams * 10) / 10,
        counted: reason === null,
        reason,
      };
    },
  );

  const perServing = Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [key, total[key] / recipe.servings]),
  ) as Nutrients;
  const percentDailyValue = Object.fromEntries(
    DAILY_VALUE_KEYS.map((key) => [
      key,
      Math.round((perServing[key] / DAILY_VALUE[key]) * 100),
    ]),
  ) as Record<DailyValueKey, number>;

  const counted = ingredients.filter((ingredient) => ingredient.counted).length;
  const complete = counted === ingredients.length;
  // A missing ingredient or value can only add to a total, so "high" holds either way, but
  // "low" needs every ingredient counted and every value known.
  // Levels use the rounded percent the response shows, so a label never contradicts it.
  const highlights = HIGHLIGHTS.flatMap(({ nutrient, name, levels }) => {
    const canBeLow = complete && counted > 0 && !incomplete.has(nutrient);
    const level = levelOf(percentDailyValue[nutrient], levels, canBeLow);
    return level
      ? [
          {
            nutrient,
            level,
            percentDailyValue: percentDailyValue[nutrient],
            label: LABEL[level](name),
          },
        ]
      : [];
  });

  return {
    recipeId: recipe.id,
    servings: recipe.servings,
    perServing: roundNutrients(perServing),
    total: roundNutrients(total),
    percentDailyValue,
    incompleteNutrients: NUTRIENT_KEYS.filter((key) => incomplete.has(key)),
    highlights,
    coverage: { counted, total: ingredients.length, complete },
    ingredients,
    source: NUTRITION_SOURCE,
  };
}
