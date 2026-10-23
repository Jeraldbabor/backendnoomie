// Runs against the database in DATABASE_URL (see app.e2e-spec.ts). Deletes its test data.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('Saved recipes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const cuisine = `E2E saved ${runId}`;
  const ada = {
    token: '',
    id: '',
    email: `e2e-saved-ada-${runId}@example.test`,
  };
  const ben = {
    token: '',
    id: '',
    email: `e2e-saved-ben-${runId}@example.test`,
  };
  const recipeIds: string[] = [];
  let editorialId: string;

  const api = () => request(app.getHttpServer());
  const auth = (user: { token: string }) => ({
    Authorization: `Bearer ${user.token}`,
  });
  const createRecipe = async (title: string) => {
    const res = await api()
      .post('/api/v1/recipes')
      .set(auth(ada))
      .send({
        title,
        cuisine,
        minutes: 10,
        servings: 1,
        ingredients: [{ name: 'water' }],
        steps: ['Boil the water.'],
      })
      .expect(201);
    recipeIds.push(res.body.id);
    return res.body.id as string;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    for (const [user, displayName] of [
      [ada, 'Ada'],
      [ben, 'Ben'],
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
    for (const title of ['First', 'Second', 'Third']) {
      await createRecipe(title);
    }
    const editorial = await prisma.recipe.create({
      data: {
        title: 'Editorial',
        cuisine,
        minutes: 5,
        servings: 1,
        steps: ['Season.'],
        ingredients: { create: [{ position: 0, name: 'salt' }] },
      },
    });
    editorialId = editorial.id;
  });

  afterAll(async () => {
    // Saves go with their users and recipes (cascade).
    await prisma.recipe.deleteMany({ where: { cuisine } });
    await prisma.user.deleteMany({ where: { id: { in: [ada.id, ben.id] } } });
    await app.close();
  });

  it('requires sign-in for everything', async () => {
    await api().get('/api/v1/saved-recipes').expect(401);
    await api().put(`/api/v1/saved-recipes/${recipeIds[0]}`).expect(401);
    await api().delete(`/api/v1/saved-recipes/${recipeIds[0]}`).expect(401);
  });

  it('saves a recipe, and saving again changes nothing', async () => {
    await api()
      .put(`/api/v1/saved-recipes/${recipeIds[0]}`)
      .set(auth(ben))
      .expect(204);
    const first = await api()
      .get('/api/v1/saved-recipes')
      .set(auth(ben))
      .expect(200);

    await api()
      .put(`/api/v1/saved-recipes/${recipeIds[0]}`)
      .set(auth(ben))
      .expect(204);
    const again = await api()
      .get('/api/v1/saved-recipes')
      .set(auth(ben))
      .expect(200);

    expect(again.body).toEqual(first.body);
    expect(again.body.data).toHaveLength(1);
    expect(again.body.data[0]).toEqual({
      savedAt: expect.any(String),
      recipe: expect.objectContaining({
        id: recipeIds[0],
        author: { id: ada.id, displayName: 'Ada' },
        savedByMe: true,
      }),
    });
  });

  it("keeps each user's saved list private", async () => {
    const res = await api()
      .get('/api/v1/saved-recipes')
      .set(auth(ada))
      .expect(200);
    expect(res.body).toEqual({ data: [], nextCursor: null });
  });

  it('shows savedByMe on recipe reads only for the user who saved', async () => {
    const path = `/api/v1/recipes/${recipeIds[0]}`;
    const anonymous = await api().get(path).expect(200);
    const asBen = await api().get(path).set(auth(ben)).expect(200);
    const asAda = await api().get(path).set(auth(ada)).expect(200);
    expect([
      anonymous.body.savedByMe,
      asBen.body.savedByMe,
      asAda.body.savedByMe,
    ]).toEqual([false, true, false]);

    const list = await api()
      .get('/api/v1/recipes')
      .query({ cuisine })
      .set(auth(ben))
      .expect(200);
    const saved = list.body.data.filter(
      (r: { savedByMe: boolean }) => r.savedByMe,
    );
    expect(saved.map((r: { id: string }) => r.id)).toEqual([recipeIds[0]]);
  });

  it('rejects an invalid token on recipe reads instead of ignoring it', async () => {
    await api()
      .get('/api/v1/recipes')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('can save editorial recipes', async () => {
    await api()
      .put(`/api/v1/saved-recipes/${editorialId}`)
      .set(auth(ben))
      .expect(204);
    const res = await api()
      .get(`/api/v1/recipes/${editorialId}`)
      .set(auth(ben))
      .expect(200);
    expect(res.body).toMatchObject({ author: null, savedByMe: true });
  });

  it('rejects unknown and malformed recipe ids', async () => {
    await api()
      .put('/api/v1/saved-recipes/01a16214-0000-7000-8000-000000000000')
      .set(auth(ben))
      .expect(404);
    await api()
      .put('/api/v1/saved-recipes/not-a-uuid')
      .set(auth(ben))
      .expect(400);
  });

  it('pages the saved list, most recently saved first', async () => {
    await api()
      .put(`/api/v1/saved-recipes/${recipeIds[1]}`)
      .set(auth(ben))
      .expect(204);
    await api()
      .put(`/api/v1/saved-recipes/${recipeIds[2]}`)
      .set(auth(ben))
      .expect(204);

    const first = await api()
      .get('/api/v1/saved-recipes')
      .query({ limit: 2 })
      .set(auth(ben))
      .expect(200);
    const second = await api()
      .get('/api/v1/saved-recipes')
      .query({ limit: 2, cursor: first.body.nextCursor })
      .set(auth(ben))
      .expect(200);

    const order = [...first.body.data, ...second.body.data].map(
      (item: { recipe: { id: string } }) => item.recipe.id,
    );
    expect(order).toEqual([
      recipeIds[2],
      recipeIds[1],
      editorialId,
      recipeIds[0],
    ]);
    expect(second.body.nextCursor).toBeNull();
  });

  it('unsaves, and unsaving again is fine', async () => {
    const path = `/api/v1/saved-recipes/${recipeIds[1]}`;
    await api().delete(path).set(auth(ben)).expect(204);
    await api().delete(path).set(auth(ben)).expect(204);

    const res = await api()
      .get(`/api/v1/recipes/${recipeIds[1]}`)
      .set(auth(ben))
      .expect(200);
    expect(res.body.savedByMe).toBe(false);
  });

  it("drops a recipe from everyone's saved list when its author deletes it", async () => {
    await api()
      .delete(`/api/v1/recipes/${recipeIds[2]}`)
      .set(auth(ada))
      .expect(204);

    const res = await api()
      .get('/api/v1/saved-recipes')
      .set(auth(ben))
      .expect(200);
    const ids = res.body.data.map(
      (item: { recipe: { id: string } }) => item.recipe.id,
    );
    expect(ids).not.toContain(recipeIds[2]);
    expect(ids).toEqual([editorialId, recipeIds[0]]);
  });
});
