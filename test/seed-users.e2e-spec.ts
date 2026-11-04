// Run against a disposable database: this suite owns the fixed seed account emails.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  seedUsers,
  TEST_USERS,
  TEST_USER_PASSWORD,
} from '../prisma/seed-users.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { PasswordService } from '../src/features/auth/password.service.js';

// Opt in only for an empty/disposable database, never the ordinary application database.
const describeSeed =
  process.env['SEED_USERS_E2E'] === '1' ? describe : describe.skip;

describeSeed('Test user seeder (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const passwords = new PasswordService();

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
    await prisma.user.deleteMany({
      where: { email: { in: TEST_USERS.map((user) => user.email) } },
    });
    await app.close();
  });

  it('creates the test accounts with independently salted hashes that can sign in', async () => {
    expect(await seedUsers(prisma, 'test')).toEqual({ added: 3, skipped: 0 });

    const users = await prisma.user.findMany({
      where: { email: { in: TEST_USERS.map((user) => user.email) } },
    });
    expect(users).toHaveLength(3);
    expect(new Set(users.map((user) => user.passwordHash)).size).toBe(3);
    expect(
      await prisma.session.count({
        where: { userId: { in: users.map((user) => user.id) } },
      }),
    ).toBe(0);

    for (const account of TEST_USERS) {
      const user = users.find(
        (candidate) => candidate.email === account.email,
      )!;
      expect(user).toMatchObject(account);
      expect(user.passwordHash).toMatch(/^scrypt\$32768\$8\$3\$/);
      expect(user.passwordHash).not.toContain(TEST_USER_PASSWORD);
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: account.email, password: TEST_USER_PASSWORD })
        .expect(200);
      expect(response.body.user).toMatchObject({
        id: user.id,
        email: account.email,
        displayName: account.displayName,
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${response.body.token}`)
        .expect(200);
    }
  });

  it('is safe to repeat without changing existing accounts, passwords or sessions', async () => {
    const changedHash = await passwords.hash('a changed testing password');
    await prisma.user.update({
      where: { email: TEST_USERS[0].email },
      data: {
        displayName: 'Edited tester',
        bio: 'Keep this edited bio.',
        passwordHash: changedHash,
      },
    });
    const unrelated = await prisma.user.create({
      data: {
        email: `e2e-nonseed-${Date.now()}@example.test`,
        displayName: 'Not a seed user',
        passwordHash: changedHash,
      },
    });
    try {
      const before = await prisma.user.findMany({ orderBy: { email: 'asc' } });
      const sessions = await prisma.session.findMany({
        orderBy: { id: 'asc' },
      });
      expect(await seedUsers(prisma, 'development')).toEqual({
        added: 0,
        skipped: 3,
      });
      expect(await prisma.user.findMany({ orderBy: { email: 'asc' } })).toEqual(
        before,
      );
      expect(await prisma.session.findMany({ orderBy: { id: 'asc' } })).toEqual(
        sessions,
      );
    } finally {
      await prisma.user.delete({ where: { id: unrelated.id } });
    }
  });

  it('refuses production before changing any data', async () => {
    const before = await prisma.user.findMany({ orderBy: { email: 'asc' } });
    await expect(seedUsers(prisma, 'production')).rejects.toThrow(
      'Test users can only be seeded in development or test',
    );
    expect(await prisma.user.findMany({ orderBy: { email: 'asc' } })).toEqual(
      before,
    );
  });

  it('provides a cross-platform users-only command without changing recipes', async () => {
    const recipes = await prisma.recipe.findMany({ orderBy: { id: 'asc' } });
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['db:seed:users']).toBe('tsx prisma/seed-test-users.ts');
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'prisma/seed-test-users.ts'],
      {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
        timeout: 20_000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Test users: 0 added, 3 skipped.');
    expect(await prisma.recipe.findMany({ orderBy: { id: 'asc' } })).toEqual(
      recipes,
    );
  }, 30_000);
});
