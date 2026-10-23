import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { OptionalSessionAuthGuard } from '../auth/session-auth.guard.js';
import { DiscoverService } from './discover.service.js';
import { DiscoverRecipesQueryDto } from './dto/discover-recipes-query.dto.js';

// Open to everyone, like recipe reads; signed-in users also get savedByMe.
@ApiTags('discover')
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  /** Recipes you can make (or almost make) with the ingredients you have. */
  @Get('recipes')
  @UseGuards(OptionalSessionAuthGuard)
  @ApiBearerAuth()
  matchRecipes(
    @Query() query: DiscoverRecipesQueryDto,
    @CurrentAuth() auth: AuthContext | undefined,
  ) {
    return this.discoverService.matchRecipes(query, auth?.user.id);
  }
}
