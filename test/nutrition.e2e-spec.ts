// Runs against the database in DATABASE_URL (see app.e2e-spec.ts), so food names get their
// match keys from the real ingredient_match_key function. Deletes its test data.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { USDA_FOODS } from '../src/features/nutrition/usda-foods.js';

describe('Recipe nutrition (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const cuisine = `E2E nutrition ${runId}`;
  const cook = { email: `e2e-nutrition-${runId}@example.test`, token: '' };
  let recipeId: string;

  const api = () => request(app.getHttpServer());
  const nutrition = (id: string) =>
    api().get(`/api/v1/recipes/${id}/nutrition`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const registered = await api()
      .post('/api/v1/auth/register')
      .send({
        email: cook.email,
        password: 'correct horse battery',
        displayName: 'Cook',
      })
      .expect(201);
    cook.token = registered.body.token;

    const created = await api()
      .post('/api/v1/recipes')
      .set({ Authorization: `Bearer ${cook.token}` })
      .send({
        title: 'Chicken adobo',
        cuisine,
        minutes: 60,
        servings: 4,
        ingredients: [
          { name: 'Bone-in Chicken Thighs', quantity: 1, unit: 'kg' },
          { name: 'toyo', quantity: 0.5, unit: 'cup' },
          { name: 'cane vinegar', quantity: 0.333, unit: 'cup' },
          { name: 'garlic', quantity: 6, unit: 'clove', note: 'crushed' },
          { name: 'bay leaves', quantity: 3 },
          { name: 'whole peppercorns', quantity: 1, unit: 'tsp' },
          { name: 'water', quantity: 1, unit: 'cup' },
          { name: 'calamansi', quantity: 4 },
          { name: 'salt', note: 'to taste' },
        ],
        steps: ['Simmer everything until the chicken is tender.'],
      })
      .expect(201);
    recipeId = created.body.id;
  });

  afterAll(async () => {
    await prisma.recipe.deleteMany({ where: { cuisine } });
    await prisma.user.deleteMany({ where: { email: cook.email } });
    await app.close();
  });

  it('estimates nutrition from the ingredients, for anyone', async () => {
    const res = await nutrition(recipeId).expect(200);

    expect(res.body).toMatchObject({
      recipeId,
      servings: 4,
      incompleteNutrients: [],
      coverage: { counted: 6, total: 9, complete: false },
      source: {
        name: 'USDA FoodData Central, SR Legacy (2018)',
        url: 'https://fdc.nal.usda.gov',
      },
    });
    // 1 kg chicken thighs alone are 2210 kcal and 810 mg sodium; 1/2 cup soy sauce adds
    // about 68 kcal and 7031 mg sodium.
    expect(res.body.total.energyKcal).toBeGreaterThan(2300);
    expect(res.body.total.energyKcal).toBeLessThan(2350);
    expect(res.body.total.sodiumMg).toBeGreaterThan(7800);
    expect(res.body.perServing.energyKcal).toBe(
      Math.round(res.body.total.energyKcal / 4),
    );
    expect(res.body.highlights.map((h: { label: string }) => h.label)).toEqual([
      'High in protein',
      'High in fat',
      'High in saturated fat',
      'High in sodium',
    ]);
  });

  it('shows what each ingredient was counted as, and why some were not', async () => {
    const res = await nutrition(recipeId).expect(200);

    const rows = res.body.ingredients.map(
      (row: { name: string; food: { fdcId: number } | null }) => ({
        ...row,
        food: row.food?.fdcId ?? null,
      }),
    );
    expect(rows).toEqual([
      {
        name: 'Bone-in Chicken Thighs',
        quantity: 1,
        unit: 'kg',
        food: 172385,
        grams: 1000,
        counted: true,
        reason: null,
      },
      {
        name: 'toyo',
        quantity: 0.5,
        unit: 'cup',
        food: 174277,
        grams: 128,
        counted: true,
        reason: null,
      },
      {
        name: 'cane vinegar',
        quantity: 0.333,
        unit: 'cup',
        food: 172237,
        grams: 79.4,
        counted: true,
        reason: null,
      },
      {
        name: 'garlic',
        quantity: 6,
        unit: 'clove',
        food: 169230,
        grams: 18,
        counted: true,
        reason: null,
      },
      {
        name: 'bay leaves',
        quantity: 3,
        unit: null,
        food: 170917,
        grams: null,
        counted: false,
        reason: 'unknown_unit',
      },
      {
        name: 'whole peppercorns',
        quantity: 1,
        unit: 'tsp',
        food: 170931,
        grams: 2.9,
        counted: true,
        reason: null,
      },
      {
        name: 'water',
        quantity: 1,
        unit: 'cup',
        food: 173647,
        grams: 236.8,
        counted: true,
        reason: null,
      },
      {
        name: 'calamansi',
        quantity: 4,
        unit: null,
        food: null,
        grams: null,
        counted: false,
        reason: 'unknown_food',
      },
      {
        name: 'salt',
        quantity: null,
        unit: null,
        food: 173468,
        grams: null,
        counted: false,
        reason: 'no_amount',
      },
    ]);
  });

  it('gives every food name a match key of its own in the database', async () => {
    const names = USDA_FOODS.flatMap((food, entry) =>
      food.names.map((name) => ({ name, entry })),
    );
    const rows = await prisma.$queryRaw<{ name: string; key: string | null }[]>`
      SELECT name, ingredient_match_key(name) AS key
      FROM unnest(${names.map(({ name }) => name)}::text[]) AS name
    `;
    const keyOf = new Map(rows.map(({ name, key }) => [name, key]));
    expect(names.filter(({ name }) => !keyOf.get(name))).toEqual([]);

    // Entries may share a USDA food ("tomato", "cherry tomato") but not a key.
    const namesOfKey = new Map<string, { name: string; entry: number }[]>();
    for (const name of names) {
      const key = keyOf.get(name.name) ?? '';
      namesOfKey.set(key, [...(namesOfKey.get(key) ?? []), name]);
    }
    const shared = [...namesOfKey.values()].filter(
      (same) => new Set(same.map(({ entry }) => entry)).size > 1,
    );
    expect(shared).toEqual([]);
  });

  it('follows edits to the recipe', async () => {
    await api()
      .patch(`/api/v1/recipes/${recipeId}`)
      .set({ Authorization: `Bearer ${cook.token}` })
      .send({
        servings: 2,
        ingredients: [{ name: 'rice', quantity: 200, unit: 'g' }],
      })
      .expect(200);

    const res = await nutrition(recipeId).expect(200);
    expect(res.body).toMatchObject({
      servings: 2,
      total: { energyKcal: 730 },
      perServing: { energyKcal: 365 },
      coverage: { counted: 1, total: 1, complete: true },
    });
  });

  it('is 404 for a recipe that does not exist and 400 for a malformed id', async () => {
    const missing = '0190a000-0000-7000-8000-000000000000';
    const res = await nutrition(missing).expect(404);
    expect(res.body.message).toBe(`Recipe ${missing} not found`);
    await nutrition('not-a-uuid').expect(400);
  });
});
