// Runs against the database in DATABASE_URL (see app.e2e-spec.ts). Deletes its test data.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';

type User = { email: string; id: string; token: string };
type ListItem = {
  followedAt: string;
  profile: { id: string; displayName: string; followedByMe: boolean };
};

describe('Follows and feed (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'correct horse battery';
  const cuisine = `E2E follows ${runId}`;
  const [ada, ben, cat]: User[] = ['ada', 'ben', 'cat'].map((name) => ({
    email: `e2e-follows-${name}-${runId}@example.test`,
    id: '',
    token: '',
  }));

  const api = () => request(app.getHttpServer());
  const auth = (user: User) => ({ Authorization: `Bearer ${user.token}` });
  const follow = (follower: User, followed: User) =>
    api().put(`/api/v1/profiles/${followed.id}/follow`).set(auth(follower));
  const profile = (user: User, viewer?: User) => {
    const req = api().get(`/api/v1/profiles/${user.id}`);
    return viewer ? req.set(auth(viewer)) : req;
  };
  const createRecipe = async (author: User, title: string) => {
    const res = await api()
      .post('/api/v1/recipes')
      .set(auth(author))
      .send({
        title,
        cuisine,
        minutes: 10,
        servings: 1,
        ingredients: [{ name: 'rice', quantity: 100, unit: 'g' }],
        steps: ['Cook.'],
      })
      .expect(201);
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
      [cat, 'Cat'],
    ] as const) {
      const res = await api()
        .post('/api/v1/auth/register')
        .send({ email: user.email, password, displayName })
        .expect(201);
      user.id = res.body.user.id;
      user.token = res.body.token;
    }
  });

  afterAll(async () => {
    const emails = [ada, ben, cat].map((user) => user.email);
    await prisma.recipe.deleteMany({ where: { cuisine } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await app.close();
  });

  describe('following', () => {
    it('needs sign-in, a real other user, and a valid id', async () => {
      await api().put(`/api/v1/profiles/${ben.id}/follow`).expect(401);
      const self = await follow(ada, ada).expect(400);
      expect(self.body.message).toBe("You can't follow yourself");
      await api()
        .put('/api/v1/profiles/00000000-0000-7000-8000-000000000000/follow')
        .set(auth(ada))
        .expect(404);
      await api()
        .put('/api/v1/profiles/not-a-uuid/follow')
        .set(auth(ada))
        .expect(400);
    });

    it('follows once, however many times it is sent', async () => {
      await follow(ada, ben).expect(204);
      await follow(ada, ben).expect(204);
      await follow(cat, ben).expect(204);

      const res = await profile(ben).expect(200);
      expect(res.body).toMatchObject({
        followerCount: 2,
        followingCount: 0,
        followedByMe: false,
      });
      const adas = await profile(ada).expect(200);
      expect(adas.body).toMatchObject({ followerCount: 0, followingCount: 1 });
    });

    it('tells signed-in viewers whether they follow the profile', async () => {
      expect((await profile(ben, ada).expect(200)).body.followedByMe).toBe(
        true,
      );
      expect((await profile(ada, ben).expect(200)).body.followedByMe).toBe(
        false,
      );
      await api()
        .get(`/api/v1/profiles/${ben.id}`)
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });

    it('lists followers, newest first, with paging', async () => {
      const first = await api()
        .get(`/api/v1/profiles/${ben.id}/followers`)
        .query({ limit: 1 })
        .expect(200);
      expect(first.body.data.map((i: ListItem) => i.profile.id)).toEqual([
        cat.id,
      ]);
      expect(first.body.nextCursor).toEqual(expect.any(String));

      const second = await api()
        .get(`/api/v1/profiles/${ben.id}/followers`)
        .query({ limit: 1, cursor: first.body.nextCursor })
        .expect(200);
      expect(second.body).toEqual({
        data: [
          {
            followedAt: expect.any(String),
            profile: {
              id: ada.id,
              displayName: 'Ada',
              photo: null,
              followedByMe: false,
            },
          },
        ],
        nextCursor: null,
      });
      expect(second.body.data[0].profile).not.toHaveProperty('email');
    });

    it("lists who a user follows, with the viewer's own follows marked", async () => {
      const res = await api()
        .get(`/api/v1/profiles/${ada.id}/following`)
        .set(auth(cat))
        .expect(200);

      expect(res.body.data.map((i: ListItem) => i.profile)).toEqual([
        { id: ben.id, displayName: 'Ben', photo: null, followedByMe: true },
      ]);
      await api()
        .get('/api/v1/profiles/00000000-0000-7000-8000-000000000000/followers')
        .expect(404);
    });
  });

  describe('feed', () => {
    const titles = (body: { data: { title: string }[] }) =>
      body.data.map((recipe) => recipe.title);

    beforeAll(async () => {
      await createRecipe(ben, 'Ben first');
      await createRecipe(cat, 'Cat only');
      await createRecipe(ada, 'Ada own');
      await createRecipe(ben, 'Ben second');
    });

    it('needs sign-in', () => {
      return api().get('/api/v1/feed').expect(401);
    });

    it('shows recipes by followed users only, newest first, without steps', async () => {
      const res = await api().get('/api/v1/feed').set(auth(ada)).expect(200);

      expect(titles(res.body)).toEqual(['Ben second', 'Ben first']);
      expect(res.body.data[0]).not.toHaveProperty('steps');
      expect(res.body.data[0].author).toMatchObject({ id: ben.id });
      expect(res.body.nextCursor).toBeNull();
    });

    it('pages with a cursor and marks saved recipes', async () => {
      const first = await api()
        .get('/api/v1/feed')
        .query({ limit: 1 })
        .set(auth(ada))
        .expect(200);
      await api()
        .put(`/api/v1/saved-recipes/${first.body.data[0].id}`)
        .set(auth(ada))
        .expect(204);

      const again = await api()
        .get('/api/v1/feed')
        .query({ limit: 1 })
        .set(auth(ada))
        .expect(200);
      expect(again.body.data[0].savedByMe).toBe(true);

      const second = await api()
        .get('/api/v1/feed')
        .query({ limit: 1, cursor: first.body.nextCursor })
        .set(auth(ada))
        .expect(200);
      expect(titles(second.body)).toEqual(['Ben first']);
    });

    it('is empty for someone who follows nobody', async () => {
      const res = await api().get('/api/v1/feed').set(auth(ben)).expect(200);
      expect(res.body).toEqual({ data: [], nextCursor: null });
    });
  });

  describe('unfollowing', () => {
    it('removes the follow and the recipes from the feed; repeating is fine', async () => {
      await api()
        .delete(`/api/v1/profiles/${ben.id}/follow`)
        .set(auth(ada))
        .expect(204);
      await api()
        .delete(`/api/v1/profiles/${ben.id}/follow`)
        .set(auth(ada))
        .expect(204);

      const feed = await api().get('/api/v1/feed').set(auth(ada)).expect(200);
      expect(feed.body.data).toEqual([]);
      expect((await profile(ben).expect(200)).body.followerCount).toBe(1);
    });

    it("goes away with the follower's account", async () => {
      await api()
        .post('/api/v1/auth/delete-account')
        .set(auth(cat))
        .send({ password })
        .expect(204);

      const res = await profile(ben).expect(200);
      expect(res.body.followerCount).toBe(0);
      const followers = await api()
        .get(`/api/v1/profiles/${ben.id}/followers`)
        .expect(200);
      expect(followers.body.data).toEqual([]);
    });
  });
});
