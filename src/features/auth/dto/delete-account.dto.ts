import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  /** The account's current password, confirming the deletion. */
  @IsString()
  @IsNotEmpty({ message: 'Enter your password' })
  @MaxLength(128)
  password: string;
}
