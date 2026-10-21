// Runs against the database in DATABASE_URL (see app.e2e-spec.ts). Deletes its test user.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const email = `e2e-${Date.now()}@example.test`;
  const password = 'correct horse battery';
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.get(PrismaService).user.deleteMany({ where: { email } });
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it('registers a user and returns a session token', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({
        email: `  ${email.toUpperCase()} `,
        password,
        displayName: ' Ada ',
      })
      .expect(201);

    expect(res.body.user).toEqual({
      id: expect.any(String),
      email,
      displayName: 'Ada',
      createdAt: expect.any(String),
    });
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body).toHaveProperty('expiresAt');
  });

  it('rejects a second account with the same email', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email, password, displayName: 'Ada again' })
      .expect(409);

    expect(res.body.message).toBe('An account with this email already exists');
  });

  it('validates registration input', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short', displayName: '' })
      .expect(400);

    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'Enter a valid email address',
        'Password must be at least 8 characters',
        'Enter your name',
      ]),
    );
  });

  it('rejects a wrong password and an unknown email identically', async () => {
    const wrong = await api()
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong password' })
      .expect(401);
    const unknown = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.test', password })
      .expect(401);

    expect(wrong.body).toEqual(unknown.body);
  });

  it('logs in and reads the current user', async () => {
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    token = login.body.token;

    const me = await api()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body.email).toBe(email);
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('requires a valid token for /me', async () => {
    await api().get('/api/v1/auth/me').expect(401);
    await api()
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('logs out and revokes the token', async () => {
    await api()
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await api()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
