import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../../common/transforms/normalize-email.transform.js';
import { Trim } from '../../../common/transforms/trim.transform.js';

export class RegisterDto {
  /** @example "ada@example.com" */
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254, { message: 'Email must be at most 254 characters' })
  email: string;

  /** At least 8 characters. @example "correct horse battery" */
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  password: string;

  /** @example "Ada" */
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Enter your name' })
  @MaxLength(50, { message: 'Name must be at most 50 characters' })
  displayName: string;
}
