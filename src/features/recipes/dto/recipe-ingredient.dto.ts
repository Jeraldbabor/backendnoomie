import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateBy,
  ValidateIf,
  type ValidationArguments,
} from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';

/**
 * Units an ingredient's quantity can be in. Adding one is not a breaking change for the app;
 * renaming or removing one is. Countable items ("2 eggs") have no unit.
 */
export const INGREDIENT_UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'oz',
  'lb',
  'pinch',
  'clove',
  'slice',
  'can',
  'bunch',
  'handful',
] as const;

export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

const MAX_QUANTITY = 100_000;

/** A number above 0 and up to 100,000, with at most 3 decimals (0.25, 1.5, 400). */
const IsQuantity = () =>
  ValidateBy({
    name: 'isQuantity',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'number' &&
        value > 0 &&
        value <= MAX_QUANTITY &&
        Number(value.toFixed(3)) === value,
      defaultMessage: ({ property, value }: ValidationArguments) =>
        value === undefined || value === null
          ? `${property} is required when unit is set`
          : `${property} must be a number above 0 and up to ${MAX_QUANTITY}, with at most 3 decimals`,
    },
  });

export class RecipeIngredientDto {
  /** @example "chickpeas" */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /** Amount in `unit`, or a count without a unit. Leave out for "to taste". @example 400 */
  @ValidateIf(
    ({ quantity, unit }: RecipeIngredientDto) =>
      (quantity !== undefined && quantity !== null) ||
      (unit !== undefined && unit !== null),
  )
  @IsQuantity()
  quantity?: number | null;

  /** @example "g" */
  @IsOptional()
  @IsIn(INGREDIENT_UNITS)
  unit?: IngredientUnit | null;

  /** Free text, such as "drained" or "to taste". An empty note is stored as null. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  note?: string | null;
}
