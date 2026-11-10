import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NutritionService } from './nutrition.service.js';

// Public, like reading the recipe. Nothing here depends on who asks.
@ApiTags('nutrition')
@Controller('recipes')
export class NutritionController {
  constructor(private readonly nutrition: NutritionService) {}

  @Get(':id/nutrition')
  forRecipe(@Param('id', ParseUUIDPipe) id: string) {
    return this.nutrition.forRecipe(id);
  }
}
