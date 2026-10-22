import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../common/dto/cursor-pagination-query.dto.js';
import { Trim } from '../../../common/transforms/trim.transform.js';

export class ListRecipesQueryDto extends CursorPaginationQueryDto {
  /** Case-insensitive match on title or description. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  /** Exact cuisine name, e.g. "Mediterranean". */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  cuisine?: string;

  /** Only recipes by this user, for example on their profile. */
  @IsOptional()
  @IsUUID()
  authorId?: string;
}
