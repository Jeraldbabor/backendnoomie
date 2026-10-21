import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../../common/transforms/normalize-email.transform.js';

export class LoginDto {
  /** @example "ada@example.com" */
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter your password' })
  @MaxLength(128)
  password: string;
}
