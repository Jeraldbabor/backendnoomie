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
} from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';

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

  /** @example ["chickpeas", "cucumber", "lemon"] */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(100, { each: true })
  ingredients: string[];
}
