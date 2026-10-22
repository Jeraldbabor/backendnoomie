import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RecipesController } from './recipes.controller.js';
import { RecipesService } from './recipes.service.js';

@Module({
  // AuthModule provides SessionAuthGuard's AuthService for the write routes.
  imports: [AuthModule],
  controllers: [RecipesController],
  providers: [RecipesService],
  exports: [RecipesService],
})
export class RecipesModule {}
