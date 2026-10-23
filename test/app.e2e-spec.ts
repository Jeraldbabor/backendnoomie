// Runs against the database in DATABASE_URL (start it with `npm run docker:db`
// and apply migrations with `npm run db:deploy`). Cleans up the rows it creates.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('Noomie API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it('GET /api/health reports the database as up', () => {
    return api()
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  describe('recipes', () => {
    const runId = Date.now();
    const newRecipe = {
      title: '  E2E test soup  ',
      cuisine: `Test kitchen ${runId}`,
      minutes: 15,
      servings: 2,
      ingredients: [
        { name: ' water ', quantity: 1.5, unit: 'l' },
        { name: 'salt', note: 'to taste' },
      ],
      steps: ['  Boil the water.  ', 'Season with salt.'],
    };
    const auth = (user: { token: string }) => ({
      Authorization: `Bearer ${user.token}`,
    });
    const owner = {
      token: '',
      id: '',
      email: `e2e-owner-${runId}@example.test`,
    };
    const other = {
      token: '',
      id: '',
      email: `e2e-other-${runId}@example.test`,
    };
    let id: string;
    let editorialId: string;

    beforeAll(async () => {
      for (const [user, displayName] of [
        [owner, 'Recipe Owner'],
        [other, 'Someone Else'],
      ] as const) {
        const res = await api()
          .post('/api/v1/auth/register')
          .send({
            email: user.email,
            password: 'correct horse battery',
            displayName,
          })
          .expect(201);
        user.token = res.body.token;
        user.id = res.body.user.id;
      }
      const editorial = await prisma.recipe.create({
        data: {
          title: 'E2E editorial recipe',
          cuisine: newRecipe.cuisine,
          minutes: 15,
          servings: 2,
          steps: ['Serve.'],
          ingredients: { create: [{ position: 0, name: 'water' }] },
        },
      });
      editorialId = editorial.id;
    });

    afterAll(async () => {
      // Recipes first: deleting a user who still has recipes is restricted.
      await prisma.recipe.deleteMany({
        where: { cuisine: newRecipe.cuisine },
      });
      await prisma.user.deleteMany({
        where: { email: { in: [owner.email, other.email] } },
      });
    });

    it('requires sign-in to create a recipe', () => {
      return api().post('/api/v1/recipes').send(newRecipe).expect(401);
    });

    it('creates a recipe owned by the signed-in user', async () => {
      const res = await api()
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${owner.token}`)
        .send(newRecipe)
        .expect(201);

      id = res.body.id;
      expect(res.body).toMatchObject({
        title: 'E2E test soup',
        minutes: 15,
        servings: 2,
        author: { id: owner.id, displayName: 'Recipe Owner' },
      });
      expect(res.body.ingredients).toEqual([
        { name: 'water', quantity: 1.5, unit: 'l', note: null },
        { name: 'salt', quantity: null, unit: null, note: 'to taste' },
      ]);
      expect(res.body.steps).toEqual(['Boil the water.', 'Season with salt.']);
      expect(res.body.author).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('authorId');
    });

    it('rejects invalid ingredients and steps', async () => {
      const res = await api()
        .post('/api/v1/recipes')
        .set(auth(owner))
        .send({
          ...newRecipe,
          servings: 0,
          ingredients: [
            { name: 'flour', unit: 'g' },
            { name: 'sugar', quantity: 0.0001 },
            { name: 'eggs', quantity: 1, unit: 'dozen' },
            { name: '', calories: 5 },
          ],
          steps: [],
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'servings must not be less than 1',
          'ingredients.0.quantity is required when unit is set',
          'ingredients.1.quantity must be a number above 0 and up to 100000, with at most 3 decimals',
          expect.stringMatching(/^ingredients\.2\.unit must be one of/),
          'ingredients.3.name should not be empty',
          'ingredients.3.property calories should not exist',
          'steps must contain at least 1 elements',
        ]),
      );
    });

    it('rejects the old list-of-texts ingredients', async () => {
      await api()
        .post('/api/v1/recipes')
        .set(auth(owner))
        .send({ ...newRecipe, ingredients: ['water', 'salt'] })
        .expect(400);
    });

    it('rejects a forged author and invalid fields', async () => {
      const res = await api()
        .post('/api/v1/recipes')
        .set('Authorization', `Bearer ${other.token}`)
        .send({ ...newRecipe, minutes: 0, authorId: owner.id })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'minutes must not be less than 1',
          'property authorId should not exist',
        ]),
      );
    });

    it('lets anyone read recipes, with the author', async () => {
      const res = await api()
        .get('/api/v1/recipes')
        .query({ cuisine: newRecipe.cuisine, limit: 5 })
        .expect(200);

      const created = res.body.data.find((r: { id: string }) => r.id === id);
      expect(created.author).toEqual({
        id: owner.id,
        displayName: 'Recipe Owner',
      });
      // Lists carry ingredients but leave the steps to the single-recipe read.
      expect(created.ingredients).toHaveLength(2);
      expect(created).not.toHaveProperty('steps');
      const editorial = res.body.data.find(
        (r: { id: string }) => r.id === editorialId,
      );
      expect(editorial.author).toBeNull();
      expect(res.body).toHaveProperty('nextCursor');
    });

    it('rejects anonymous and non-author changes', async () => {
      await api()
        .patch(`/api/v1/recipes/${id}`)
        .send({ minutes: 1 })
        .expect(401);
      await api().delete(`/api/v1/recipes/${id}`).expect(401);
      await api()
        .patch(`/api/v1/recipes/${id}`)
        .set('Authorization', `Bearer ${other.token}`)
        .send({ minutes: 1 })
        .expect(403);
      await api()
        .delete(`/api/v1/recipes/${id}`)
        .set('Authorization', `Bearer ${other.token}`)
        .expect(403);

      const unchanged = await api().get(`/api/v1/recipes/${id}`).expect(200);
      expect(unchanged.body.minutes).toBe(15);
    });

    it('keeps editorial recipes read-only, even for signed-in users', () => {
      return api()
        .patch(`/api/v1/recipes/${editorialId}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ minutes: 1 })
        .expect(403);
    });

    it('lets the author update their recipe', async () => {
      const res = await api()
        .patch(`/api/v1/recipes/${id}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ minutes: 25 })
        .expect(200);

      expect(res.body.minutes).toBe(25);
      expect(res.body.author.id).toBe(owner.id);
      expect(res.body.ingredients).toHaveLength(2);
      expect(res.body.steps).toHaveLength(2);
    });

    it('replaces the whole ingredient and step lists when they are sent', async () => {
      const res = await api()
        .patch(`/api/v1/recipes/${id}`)
        .set(auth(owner))
        .send({
          ingredients: [
            { name: 'stock', quantity: 1, unit: 'l' },
            { name: 'noodles', quantity: 200, unit: 'g' },
            { name: 'pepper', note: '' },
          ],
          steps: ['Heat the stock.', 'Cook the noodles in it.'],
        })
        .expect(200);

      expect(res.body.ingredients).toEqual([
        { name: 'stock', quantity: 1, unit: 'l', note: null },
        { name: 'noodles', quantity: 200, unit: 'g', note: null },
        { name: 'pepper', quantity: null, unit: null, note: null },
      ]);
      expect(res.body.steps).toEqual([
        'Heat the stock.',
        'Cook the noodles in it.',
      ]);
      const read = await api().get(`/api/v1/recipes/${id}`).expect(200);
      expect(
        read.body.ingredients.map((i: { name: string }) => i.name),
      ).toEqual(['stock', 'noodles', 'pepper']);
    });

    it('rejects a malformed id', () => {
      return api().get('/api/v1/recipes/not-a-uuid').expect(400);
    });

    it('lets the author delete their recipe, then reports it missing', async () => {
      await api()
        .delete(`/api/v1/recipes/${id}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(204);
      await api().get(`/api/v1/recipes/${id}`).expect(404);
      await api()
        .delete(`/api/v1/recipes/${id}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(404);
    });
  });
});
