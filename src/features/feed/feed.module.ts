import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RecipesModule } from '../recipes/recipes.module.js';
import { FeedController } from './feed.controller.js';

@Module({
  // The feed is a recipe list (RecipesService, exported by RecipesModule) filtered by
  // follows. AuthModule provides SessionAuthGuard's AuthService.
  imports: [AuthModule, RecipesModule],
  controllers: [FeedController],
})
export class FeedModule {}
