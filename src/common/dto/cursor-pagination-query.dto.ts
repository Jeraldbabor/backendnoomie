import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CursorPaginationQueryDto {
  /** Id of the last item from the previous page. */
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
}
