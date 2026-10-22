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
      ingredients: ['water', 'salt'],
    };
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
        data: { ...newRecipe, title: 'E2E editorial recipe' },
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
        author: { id: owner.id, displayName: 'Recipe Owner' },
      });
      expect(res.body.author).not.toHaveProperty('email');
      expect(res.body).not.toHaveProperty('authorId');
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
