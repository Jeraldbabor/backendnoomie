import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CursorPaginationQueryDto } from '../../common/dto/cursor-pagination-query.dto.js';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { RecipesService } from '../recipes/recipes.service.js';

// Each user's own feed; there is no way to read someone else's.
@ApiTags('feed')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('feed')
export class FeedController {
  constructor(private readonly recipesService: RecipesService) {}

  /** Recipes by the people you follow, newest first. */
  @Get()
  feed(
    @Query() query: CursorPaginationQueryDto,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.recipesService.findFeed(auth.user.id, query);
  }
}
