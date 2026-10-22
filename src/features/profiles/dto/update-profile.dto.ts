import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../../common/transforms/trim.transform.js';

/** Send only the fields to change. */
export class UpdateProfileDto {
  /** @example "Ada" */
  // Optional, but if sent it can't be null or empty: every user has a name.
  @ValidateIf((dto: UpdateProfileDto) => dto.displayName !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Enter your name' })
  @MaxLength(50, { message: 'Name must be at most 50 characters' })
  displayName?: string;

  /** Up to 160 characters. Send null or "" to remove it. @example "Home cook. Mostly noodles." */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(160, { message: 'Bio must be at most 160 characters' })
  bio?: string | null;
}
