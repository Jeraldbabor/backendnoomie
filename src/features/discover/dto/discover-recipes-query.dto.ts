import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';

/**
 * `?ingredients=rice,miso` (or the parameter repeated) becomes ['rice', 'miso']: split on
 * commas, trimmed, blanks dropped.
 */
const ToNameList = () =>
  Transform(({ value }: { value: unknown }) =>
    (Array.isArray(value) ? value : [value])
      .flatMap((item: unknown) =>
        typeof item === 'string' ? item.split(',') : [item],
      )
      .map((item: unknown) => (typeof item === 'string' ? item.trim() : item))
      .filter((item: unknown) => item !== ''),
  );

export class DiscoverRecipesQueryDto {
  /** What the user has, separated by commas. @example "rice,mushrooms,miso" */
  @ToNameList()
  @IsArray()
  @ArrayMinSize(1, { message: 'Enter at least one ingredient' })
  @ArrayMaxSize(30, { message: 'Enter at most 30 ingredients' })
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  ingredients: string[] = [];

  /** Exact cuisine name, e.g. "Mediterranean". */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  cuisine?: string;

  /** Only recipes that take at most this many minutes. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  maxMinutes?: number;

  /** Only recipes missing at most this many ingredients; 0 means "can cook now". */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  maxMissing?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
