// Runs against the database in DATABASE_URL (see app.e2e-spec.ts). Deletes its test data.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('Profiles (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const ada = { token: '', id: '', email: `e2e-ada-${runId}@example.test` };
  const ben = { token: '', id: '', email: `e2e-ben-${runId}@example.test` };

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
  });

  afterAll(async () => {
    const ids = [ada.id, ben.id].filter(Boolean);
    await prisma.recipe.deleteMany({ where: { authorId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  const api = () => request(app.getHttpServer());
  const auth = (user: { token: string }) => ({
    Authorization: `Bearer ${user.token}`,
  });

  it('shows anyone a public profile, without private data', async () => {
    const res = await api().get(`/api/v1/profiles/${ada.id}`).expect(200);

    expect(res.body).toEqual({
      id: ada.id,
      displayName: 'Ada',
      bio: null,
      photo: null,
      createdAt: expect.any(String),
      recipeCount: 0,
    });
    expect(res.body).not.toHaveProperty('email');
  });

  it('rejects unknown and malformed profile ids', async () => {
    await api()
      .get('/api/v1/profiles/01a16214-0000-7000-8000-000000000000')
      .expect(404);
    await api().get('/api/v1/profiles/not-a-uuid').expect(400);
  });

  it('requires sign-in for your own profile', async () => {
    await api().get('/api/v1/profiles/me').expect(401);
    await api().patch('/api/v1/profiles/me').send({ bio: 'x' }).expect(401);

    const res = await api()
      .get('/api/v1/profiles/me')
      .set(auth(ada))
      .expect(200);
    expect(res.body.id).toBe(ada.id);
  });

  it('lets you edit your own name and bio', async () => {
    const res = await api()
      .patch('/api/v1/profiles/me')
      .set(auth(ada))
      .send({
        displayName: '  Ada L.  ',
        bio: '  Home cook. Mostly noodles.  ',
      })
      .expect(200);

    expect(res.body).toMatchObject({
      id: ada.id,
      displayName: 'Ada L.',
      bio: 'Home cook. Mostly noodles.',
    });
    const me = await api().get('/api/v1/auth/me').set(auth(ada)).expect(200);
    expect(me.body.displayName).toBe('Ada L.');
  });

  it('clears the bio with an empty string', async () => {
    const res = await api()
      .patch('/api/v1/profiles/me')
      .set(auth(ada))
      .send({ bio: '' })
      .expect(200);

    expect(res.body.bio).toBeNull();
  });

  it('rejects invalid values and fields you may not change', async () => {
    const res = await api()
      .patch('/api/v1/profiles/me')
      .set(auth(ada))
      .send({
        displayName: '',
        bio: 'x'.repeat(161),
        email: 'other@example.test',
        id: ben.id,
      })
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'Enter your name',
        'Bio must be at most 160 characters',
        'property email should not exist',
        'property id should not exist',
      ]),
    );
    await api()
      .patch('/api/v1/profiles/me')
      .set(auth(ada))
      .send({ displayName: null })
      .expect(400);

    const ben_ = await api().get(`/api/v1/profiles/${ben.id}`).expect(200);
    expect(ben_.body.displayName).toBe('Ben');
  });

  it('counts recipes and lists them by author', async () => {
    const recipe = {
      title: 'E2E profile soup',
      cuisine: `E2E profiles ${runId}`,
      minutes: 10,
      servings: 1,
      ingredients: [{ name: 'water' }],
      steps: ['Boil the water.'],
    };
    await api().post('/api/v1/recipes').set(auth(ada)).send(recipe).expect(201);
    await api().post('/api/v1/recipes').set(auth(ben)).send(recipe).expect(201);

    const profile = await api().get(`/api/v1/profiles/${ada.id}`).expect(200);
    expect(profile.body.recipeCount).toBe(1);

    const list = await api()
      .get('/api/v1/recipes')
      .query({ authorId: ada.id })
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].author).toEqual({
      id: ada.id,
      displayName: 'Ada L.',
      photo: null,
    });

    await api().get('/api/v1/recipes').query({ authorId: 'nope' }).expect(400);
  });
});
