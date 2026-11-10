/** The nutrients the API reports, in response field order. */
export const NUTRIENT_KEYS = [
  'energyKcal',
  'proteinG',
  'fatG',
  'saturatedFatG',
  'carbsG',
  'fiberG',
  'sugarsG',
  'sodiumMg',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type Nutrients = Record<NutrientKey, number>;

/** Units other than weights and volumes that a food can have a USDA weight for. */
export type PortionUnit = 'each' | 'clove' | 'slice' | 'can' | 'bunch';

/** One food of the generated USDA table (usda-foods.ts). */
export interface UsdaFood {
  fdcId: number;
  description: string;
  names: readonly string[];
  /** Per 100 g as bought. Null when USDA has no value. */
  per100g: Readonly<Record<NutrientKey, number | null>>;
  /** Null when a volume of the food isn't convertible. */
  gramsPerMl: number | null;
  /** Grams in one of the unit; `each` is one counted item ("2 eggs"). */
  gramsPer: Readonly<Partial<Record<PortionUnit, number>>>;
}

/** Why an ingredient isn't in the totals. */
export type NotCountedReason = 'no_amount' | 'unknown_food' | 'unknown_unit';

export interface IngredientNutrition {
  name: string;
  quantity: number | null;
  unit: string | null;
  /** The USDA food the ingredient was matched to, or null when none matched. */
  food: { fdcId: number; description: string } | null;
  /** The ingredient's weight as counted, or null when it isn't counted. */
  grams: number | null;
  counted: boolean;
  reason: NotCountedReason | null;
}

/** Nutrients that have an FDA Daily Value. */
export const DAILY_VALUE_KEYS = [
  'proteinG',
  'fatG',
  'saturatedFatG',
  'carbsG',
  'fiberG',
  'sodiumMg',
] as const;

export type DailyValueKey = (typeof DAILY_VALUE_KEYS)[number];

export interface NutritionHighlight {
  nutrient: NutrientKey;
  level: 'high' | 'good_source' | 'low';
  /** Of the Daily Value, per serving. */
  percentDailyValue: number;
  /** Ready to show, such as "High in protein". */
  label: string;
}

export interface RecipeNutrition {
  recipeId: string;
  servings: number;
  perServing: Nutrients;
  total: Nutrients;
  /** Per serving, rounded to whole percent. */
  percentDailyValue: Record<DailyValueKey, number>;
  /** Nutrients USDA has no value for in at least one counted food: true value is higher. */
  incompleteNutrients: NutrientKey[];
  highlights: NutritionHighlight[];
  coverage: { counted: number; total: number; complete: boolean };
  ingredients: IngredientNutrition[];
  source: { name: string; url: string };
}
