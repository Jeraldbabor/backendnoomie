import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CursorPaginationQueryDto } from '../../common/dto/cursor-pagination-query.dto.js';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { SavedRecipesService } from './saved-recipes.service.js';

// All routes act on the signed-in user's own saved list; nobody can see another user's.
@ApiTags('saved-recipes')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('saved-recipes')
export class SavedRecipesController {
  constructor(private readonly savedRecipesService: SavedRecipesService) {}

  @Get()
  list(
    @Query() query: CursorPaginationQueryDto,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.savedRecipesService.list(auth.user.id, query);
  }

  @Put(':recipeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  save(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.savedRecipesService.save(auth.user.id, recipeId);
  }

  @Delete(':recipeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsave(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.savedRecipesService.unsave(auth.user.id, recipeId);
  }
}
