import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';
import { RecipeIngredientDto } from './recipe-ingredient.dto.js';

export class CreateRecipeDto {
  /** @example "Lemon & herb chickpea bowl" */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** @example "Mediterranean" */
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  cuisine: string;

  /** Total preparation and cooking time. */
  @IsInt()
  @Min(1)
  @Max(1440)
  minutes: number;

  /** How many portions the ingredient quantities make. @example 2 */
  @IsInt()
  @Min(1)
  @Max(100)
  servings: number;

  /** In the order they should be listed. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients: RecipeIngredientDto[];

  /** Cooking instructions in order, one entry per step. @example ["Rinse the chickpeas."] */
  @Trim()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(1000, { each: true })
  steps: string[];
}
