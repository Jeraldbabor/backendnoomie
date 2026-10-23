// Runs against the database in DATABASE_URL (see app.e2e-spec.ts). Deletes its test data.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('Account management (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'correct horse battery';
  const ada = { email: `e2e-account-ada-${runId}@example.test`, id: '' };
  const ben = { email: `e2e-account-ben-${runId}@example.test`, id: '' };

  const api = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const register = async (email: string, displayName: string) => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email, password, displayName })
      .expect(201);
    return { token: res.body.token as string, id: res.body.user.id as string };
  };
  const login = (email: string, pass: string) =>
    api().post('/api/v1/auth/login').send({ email, password: pass });

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
    const users = await prisma.user.findMany({
      where: { email: { in: [ada.email, ben.email] } },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    await prisma.recipe.deleteMany({ where: { authorId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  it('requires sign-in for every account action', async () => {
    await api().post('/api/v1/auth/change-password').expect(401);
    await api().post('/api/v1/auth/logout-all').expect(401);
    await api().post('/api/v1/auth/delete-account').expect(401);
  });

  describe('change password', () => {
    let phone: string;
    let laptop: string;

    beforeAll(async () => {
      ({ token: phone, id: ada.id } = await register(ada.email, 'Ada'));
      laptop = (await login(ada.email, password).expect(200)).body.token;
    });

    it('rejects a wrong current password with 400, not 401', async () => {
      const res = await api()
        .post('/api/v1/auth/change-password')
        .set(bearer(phone))
        .send({
          currentPassword: 'wrong password',
          newPassword: 'brand new pass',
        })
        .expect(400);
      expect(res.body.message).toBe('Current password is incorrect');
    });

    it('rejects a reused or too-short new password', async () => {
      await api()
        .post('/api/v1/auth/change-password')
        .set(bearer(phone))
        .send({ currentPassword: password, newPassword: password })
        .expect(400);
      const res = await api()
        .post('/api/v1/auth/change-password')
        .set(bearer(phone))
        .send({ currentPassword: password, newPassword: 'short' })
        .expect(400);
      expect(res.body.message).toEqual([
        'Password must be at least 8 characters',
      ]);
    });

    it('changes it, keeps this device signed in, and signs out the others', async () => {
      await api()
        .post('/api/v1/auth/change-password')
        .set(bearer(phone))
        .send({ currentPassword: password, newPassword: 'brand new pass' })
        .expect(204);

      await api().get('/api/v1/auth/me').set(bearer(phone)).expect(200);
      await api().get('/api/v1/auth/me').set(bearer(laptop)).expect(401);
      await login(ada.email, password).expect(401);
      await login(ada.email, 'brand new pass').expect(200);
    });
  });

  describe('sign out everywhere', () => {
    it('ends every session, including the current one', async () => {
      const first = (await login(ada.email, 'brand new pass').expect(200)).body
        .token;
      const second = (await login(ada.email, 'brand new pass').expect(200)).body
        .token;

      await api()
        .post('/api/v1/auth/logout-all')
        .set(bearer(first))
        .expect(204);

      await api().get('/api/v1/auth/me').set(bearer(first)).expect(401);
      await api().get('/api/v1/auth/me').set(bearer(second)).expect(401);
    });
  });

  describe('delete account', () => {
    let benToken: string;
    let adaToken: string;
    let benRecipe: string;

    beforeAll(async () => {
      ({ token: benToken, id: ben.id } = await register(ben.email, 'Ben'));
      adaToken = (await login(ada.email, 'brand new pass').expect(200)).body
        .token;
      benRecipe = (
        await api()
          .post('/api/v1/recipes')
          .set(bearer(benToken))
          .send({
            title: 'E2E account soup',
            cuisine: `E2E account ${runId}`,
            minutes: 5,
            servings: 1,
            ingredients: [{ name: 'water' }],
            steps: ['Boil the water.'],
          })
          .expect(201)
      ).body.id;
      await api()
        .put(`/api/v1/saved-recipes/${benRecipe}`)
        .set(bearer(adaToken))
        .expect(204);
    });

    it('requires the correct password', async () => {
      const res = await api()
        .post('/api/v1/auth/delete-account')
        .set(bearer(benToken))
        .send({ password: 'wrong password' })
        .expect(400);
      expect(res.body.message).toBe('Password is incorrect');
      await api().get('/api/v1/auth/me').set(bearer(benToken)).expect(200);
    });

    it('deletes the account, its sessions, recipes, and saves of them', async () => {
      await api()
        .post('/api/v1/auth/delete-account')
        .set(bearer(benToken))
        .send({ password })
        .expect(204);

      await api().get('/api/v1/auth/me').set(bearer(benToken)).expect(401);
      await login(ben.email, password).expect(401);
      await api().get(`/api/v1/profiles/${ben.id}`).expect(404);
      await api().get(`/api/v1/recipes/${benRecipe}`).expect(404);

      const saved = await api()
        .get('/api/v1/saved-recipes')
        .set(bearer(adaToken))
        .expect(200);
      expect(saved.body.data).toEqual([]);
      expect(await prisma.session.count({ where: { userId: ben.id } })).toBe(0);
    });

    it('frees the email for a new account', async () => {
      await register(ben.email, 'Ben again');
    });
  });
});
