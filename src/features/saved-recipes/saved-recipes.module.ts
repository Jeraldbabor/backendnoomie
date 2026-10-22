import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SavedRecipesController } from './saved-recipes.controller.js';
import { SavedRecipesService } from './saved-recipes.service.js';

@Module({
  // AuthModule provides SessionAuthGuard's AuthService. Recipe shapes come from
  // recipes.types.ts, the recipes feature's public response contract.
  imports: [AuthModule],
  controllers: [SavedRecipesController],
  providers: [SavedRecipesService],
})
export class SavedRecipesModule {}
