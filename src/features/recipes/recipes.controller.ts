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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateRecipeDto } from './dto/create-recipe.dto.js';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto.js';
import { UpdateRecipeDto } from './dto/update-recipe.dto.js';
import { RecipesService } from './recipes.service.js';

// TODO: guard the write endpoints once authentication exists, and set the
// recipe author from the authenticated user rather than from the request body.
@ApiTags('recipes')
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  create(@Body() dto: CreateRecipeDto) {
    return this.recipesService.create(dto);
  }

  @Get()
  findMany(@Query() query: ListRecipesQueryDto) {
    return this.recipesService.findMany(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recipesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.recipesService.remove(id);
  }
}
