// Runs against the database in DATABASE_URL (see app.e2e-spec.ts). Every request filters by
// this run's cuisine, so other recipes in the database don't affect the results. Deletes its
// test data.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';

type Ingredient = {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
};
type Result = {
  recipe: { id: string; title: string; savedByMe: boolean };
  match: { have: number; needed: number; missing: string[] };
};

describe('Discover (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const cuisine = `E2E discover ${runId}`;
  const cook = { email: `e2e-discover-${runId}@example.test`, token: '' };
  const ids: Record<string, string> = {};

  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${cook.token}` });
  const discover = (query: Record<string, string | number | string[]>) =>
    api()
      .get('/api/v1/discover/recipes')
      .query({ cuisine, ...query });
  const summary = (results: Result[]) =>
    results.map(({ recipe, match }) => [recipe.title, match]);

  const createRecipe = async (
    title: string,
    minutes: number,
    ingredients: Ingredient[],
  ) => {
    const res = await api()
      .post('/api/v1/recipes')
      .set(auth())
      .send({
        title,
        cuisine,
        minutes,
        servings: 2,
        ingredients,
        steps: ['Cook it.'],
      })
      .expect(201);
    ids[title] = res.body.id;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const res = await api()
      .post('/api/v1/auth/register')
      .send({
        email: cook.email,
        password: 'correct horse battery',
        displayName: 'Cook',
      })
      .expect(201);
    cook.token = res.body.token;

    await createRecipe('Tomato pasta', 30, [
      { name: 'pasta', quantity: 200, unit: 'g' },
      { name: 'tomatoes', quantity: 400, unit: 'g' },
      { name: 'garlic', quantity: 2, unit: 'clove' },
      { name: 'salt', note: 'to taste' },
    ]);
    await createRecipe('Garlic bread', 10, [
      { name: 'bread', quantity: 1 },
      { name: 'garlic', quantity: 3, unit: 'clove' },
      { name: 'butter', quantity: 2, unit: 'tbsp' },
    ]);
    await createRecipe('Cherry tomato salad', 10, [
      { name: 'Cherry Tomatoes', quantity: 250, unit: 'g' },
      { name: 'olive oil', quantity: 1, unit: 'tbsp' },
      { name: 'basil', note: 'to taste' },
    ]);
  });

  afterAll(async () => {
    await prisma.recipe.deleteMany({ where: { cuisine } });
    await prisma.user.deleteMany({ where: { email: cook.email } });
    await app.close();
  });

  it('ranks recipes by fewest missing ingredients and lists what is missing', async () => {
    const res = await discover({ ingredients: 'pasta, Tomato, garlic' }).expect(
      200,
    );

    expect(summary(res.body.data)).toEqual([
      ['Tomato pasta', { have: 3, needed: 3, missing: [] }],
      ['Garlic bread', { have: 1, needed: 3, missing: ['bread', 'butter'] }],
    ]);
  });

  it('prefers recipes that use more of what you have on equal missing counts', async () => {
    const res = await discover({ ingredients: 'garlic,bread,pasta' }).expect(
      200,
    );

    expect(summary(res.body.data)).toEqual([
      ['Garlic bread', { have: 2, needed: 3, missing: ['butter'] }],
      ['Tomato pasta', { have: 2, needed: 3, missing: ['tomatoes'] }],
    ]);
  });

  it('ignores case, punctuation and plural endings, but not other words', async () => {
    const res = await discover({
      ingredients: 'cherry tomato,OLIVE-OIL',
    }).expect(200);

    expect(summary(res.body.data)).toEqual([
      ['Cherry tomato salad', { have: 2, needed: 2, missing: [] }],
    ]);
  });

  it('treats ingredients without a quantity as optional', async () => {
    const res = await discover({ ingredients: 'salt,basil' }).expect(200);

    expect(res.body).toEqual({ data: [] });
  });

  it('filters by cooking time and by how many are missing', async () => {
    const quick = await discover({
      ingredients: 'pasta,tomato,garlic',
      maxMinutes: 15,
    }).expect(200);
    expect(quick.body.data.map((r: Result) => r.recipe.title)).toEqual([
      'Garlic bread',
    ]);

    const ready = await discover({
      ingredients: 'pasta,tomato,garlic',
      maxMissing: 0,
    }).expect(200);
    expect(ready.body.data.map((r: Result) => r.recipe.title)).toEqual([
      'Tomato pasta',
    ]);
  });

  it('accepts the parameter repeated, and honors the limit', async () => {
    const res = await api()
      .get('/api/v1/discover/recipes')
      .query(`cuisine=${encodeURIComponent(cuisine)}`)
      .query('ingredients=garlic&ingredients=pasta&limit=1')
      .expect(200);

    expect(res.body.data).toHaveLength(1);
  });

  it('returns recipes as in lists, with savedByMe for signed-in users', async () => {
    await api()
      .put(`/api/v1/saved-recipes/${ids['Garlic bread']}`)
      .set(auth())
      .expect(204);

    const res = await discover({ ingredients: 'garlic' })
      .set(auth())
      .expect(200);

    const [first] = res.body.data as Result[];
    expect(first.recipe).not.toHaveProperty('steps');
    expect(
      res.body.data.map((r: Result) => [r.recipe.title, r.recipe.savedByMe]),
    ).toEqual([
      ['Garlic bread', true],
      ['Tomato pasta', false],
    ]);
  });

  it('matches edited ingredients', async () => {
    await api()
      .patch(`/api/v1/recipes/${ids['Garlic bread']}`)
      .set(auth())
      .send({ ingredients: [{ name: 'Sourdough rolls', quantity: 4 }] })
      .expect(200);

    const res = await discover({ ingredients: 'sourdough roll' }).expect(200);
    expect(summary(res.body.data)).toEqual([
      ['Garlic bread', { have: 1, needed: 1, missing: [] }],
    ]);
  });

  it('rejects a request without ingredients or with too many', async () => {
    const none = await discover({ ingredients: ' , ' }).expect(400);
    expect(none.body.message).toEqual(['Enter at least one ingredient']);

    const many = Array.from({ length: 31 }, (_, i) => `item ${i}`).join();
    const tooMany = await discover({ ingredients: many }).expect(400);
    expect(tooMany.body.message).toEqual(['Enter at most 30 ingredients']);
  });

  it('rejects an invalid token instead of ignoring it', () => {
    return discover({ ingredients: 'garlic' })
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('computes match keys in the database with the documented rules', async () => {
    const pairs = [
      ['Cherry  Tomatoes', 'cherry tomato'],
      ['berries', 'berry'],
      ['Olives', 'olive'],
      ['Jalapeño', 'jalapeno'],
      ['Extra-virgin olive oil', 'extra virgin olive oil'],
      ['Potatoes', 'potato'],
    ];
    for (const [a, b] of pairs) {
      const [row] = await prisma.$queryRaw<{ a: string; b: string }[]>`
        SELECT ingredient_match_key(${a}) AS a, ingredient_match_key(${b}) AS b`;
      expect(row.a).toBe(row.b);
    }
    const [different] = await prisma.$queryRaw<{ a: string; b: string }[]>`
      SELECT ingredient_match_key('oil') AS a, ingredient_match_key('olive oil') AS b`;
    expect(different.a).not.toBe(different.b);
  });
});
