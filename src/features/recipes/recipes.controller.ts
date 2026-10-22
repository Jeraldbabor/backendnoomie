import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import {
  OptionalSessionAuthGuard,
  SessionAuthGuard,
} from '../auth/session-auth.guard.js';
import { CreateRecipeDto } from './dto/create-recipe.dto.js';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto.js';
import { UpdateRecipeDto } from './dto/update-recipe.dto.js';
import { RecipesService } from './recipes.service.js';

// Reading is open (signed-in readers also get savedByMe); creating requires sign-in, and
// only the author can update or delete.
@ApiTags('recipes')
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateRecipeDto, @CurrentAuth() auth: AuthContext) {
    return this.recipesService.create(dto, auth.user.id);
  }

  @Get()
  @UseGuards(OptionalSessionAuthGuard)
  @ApiBearerAuth()
  findMany(
    @Query() query: ListRecipesQueryDto,
    @CurrentAuth() auth: AuthContext | undefined,
  ) {
    return this.recipesService.findMany(query, auth?.user.id);
  }

  @Get(':id')
  @UseGuards(OptionalSessionAuthGuard)
  @ApiBearerAuth()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAuth() auth: AuthContext | undefined,
  ) {
    return this.recipesService.findOne(id, auth?.user.id);
  }

  @Patch(':id')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecipeDto,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.recipesService.update(id, dto, auth.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.recipesService.remove(id, auth.user.id);
  }
}
