import { readFileSync } from 'node:fs';
import { STARTER_RECIPES } from '../../../prisma/starter-dishes/recipes.js';
import { INGREDIENT_UNITS } from '../recipes/dto/recipe-ingredient.dto.js';

// The starter dishes are seed data (`npm run db:seed:dishes`). These checks keep the recipes,
// their example photos and the published credits in step.
type ExamplePhoto = { file: string; author: string; license: string };
const photos = JSON.parse(
  readFileSync('prisma/starter-dishes/example-photos.json', 'utf8'),
) as Record<string, ExamplePhoto[]>;
const credits = readFileSync('docs/api/scan-starter-dishes.md', 'utf8');

describe('starter dishes', () => {
  it('gives every recipe at least 4 example photos, and every photo a recipe', () => {
    expect(Object.keys(photos).sort()).toEqual(
      Object.keys(STARTER_RECIPES).sort(),
    );
    for (const [key, list] of Object.entries(photos)) {
      expect({ key, enough: list.length >= 4 }).toEqual({ key, enough: true });
    }
  });

  it('uses each photo once, with an open license and an author', () => {
    const files = Object.values(photos).flat();
    expect(new Set(files.map((photo) => photo.file)).size).toBe(files.length);
    for (const photo of files) {
      expect(photo.license).toMatch(
        /^(CC0|Public domain|CC BY(-SA)? [0-9.]+)$/,
      );
      expect(photo.author.length).toBeGreaterThan(0);
    }
  });

  it('writes recipes the API would accept', () => {
    const titles = Object.values(STARTER_RECIPES).map((recipe) => recipe.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const recipe of Object.values(STARTER_RECIPES)) {
      expect(recipe.title.length).toBeLessThanOrEqual(120);
      expect(recipe.steps.length).toBeGreaterThan(0);
      for (const [name, quantity, unit] of recipe.ingredients) {
        expect(name.length).toBeLessThanOrEqual(100);
        if (unit !== undefined) {
          expect(INGREDIENT_UNITS).toContain(unit);
          expect(quantity).toBeGreaterThan(0);
        }
      }
    }
  });

  it('credits every example photo in the docs', () => {
    for (const recipe of Object.values(STARTER_RECIPES)) {
      expect(credits).toContain(`### ${recipe.title}`);
    }
    for (const photo of Object.values(photos).flat()) {
      expect(credits).toContain(photo.file.replace(/[[\]|]/g, '\\$&'));
    }
  });
});
