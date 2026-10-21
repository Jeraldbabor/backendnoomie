// Runs against the database in DATABASE_URL (start it with `npm run docker:db`
// and apply migrations with `npm run db:deploy`). Cleans up the rows it creates.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('Noomie API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports the database as up', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });

  describe('recipes', () => {
    const newRecipe = {
      title: '  E2E test soup  ',
      cuisine: 'Test kitchen',
      minutes: 15,
      ingredients: ['water', 'salt'],
    };
    let id: string;

    it('creates a recipe and trims text fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/recipes')
        .send(newRecipe)
        .expect(201);

      id = res.body.id;
      expect(res.body).toMatchObject({ title: 'E2E test soup', minutes: 15 });
    });

    it('rejects invalid and unknown fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/recipes')
        .send({ ...newRecipe, minutes: 0, authorId: 'forged' })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'minutes must not be less than 1',
          'property authorId should not exist',
        ]),
      );
    });

    it('lists recipes filtered by cuisine', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/recipes')
        .query({ cuisine: 'Test kitchen', limit: 5 })
        .expect(200);

      expect(res.body.data.map((r: { id: string }) => r.id)).toContain(id);
      expect(res.body).toHaveProperty('nextCursor');
    });

    it('updates a recipe', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/recipes/${id}`)
        .send({ minutes: 25 })
        .expect(200);

      expect(res.body.minutes).toBe(25);
    });

    it('rejects a malformed id', () => {
      return request(app.getHttpServer())
        .get('/api/v1/recipes/not-a-uuid')
        .expect(400);
    });

    it('deletes a recipe, then reports it missing', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/recipes/${id}`)
        .expect(204);
      await request(app.getHttpServer())
        .get(`/api/v1/recipes/${id}`)
        .expect(404);
      // Prisma P2025 mapped to 404 by PrismaExceptionFilter
      await request(app.getHttpServer())
        .delete(`/api/v1/recipes/${id}`)
        .expect(404);
    });
  });
});
