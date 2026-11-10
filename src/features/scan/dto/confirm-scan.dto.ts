import { IsUUID } from 'class-validator';

export class ConfirmScanDto {
  /** The recipe the scanned photo shows. */
  @IsUUID()
  recipeId: string;
}
