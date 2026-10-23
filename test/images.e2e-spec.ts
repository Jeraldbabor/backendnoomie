// Runs against the database in DATABASE_URL and the storage in STORAGE_* (start both with
// `npm run docker:db`). Deletes its test data, including the stored files.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { ImagesService } from '../src/features/images/images.service.js';

type Photo = { small: string; large: string; width: number; height: number };

/** A JPEG that, like many phone photos, records where it was taken. */
const cameraPhoto = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#d9822b' } })
    .withExif({
      IFD0: { Make: 'Test phone' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '14/1 35/1 0/1' },
    })
    .jpeg()
    .toBuffer();

describe('Images (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'correct horse battery';
  const ada = {
    email: `e2e-images-ada-${runId}@example.test`,
    id: '',
    token: '',
  };
  const ben = {
    email: `e2e-images-ben-${runId}@example.test`,
    id: '',
    token: '',
  };
  let recipeId: string;

  const api = () => request(app.getHttpServer());
  const auth = (user: { token: string }) => ({
    Authorization: `Bearer ${user.token}`,
  });
  const upload = (path: string, user: { token: string }, file: Buffer) =>
    api().put(path).set(auth(user)).attach('photo', file, {
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
    });

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
        .send({ email: user.email, password, displayName })
        .expect(201);
      user.id = res.body.user.id;
      user.token = res.body.token;
    }
    const recipe = await api()
      .post('/api/v1/recipes')
      .set(auth(ada))
      .send({
        title: 'E2E photo soup',
        cuisine: `E2E images ${runId}`,
        minutes: 10,
        servings: 2,
        ingredients: [{ name: 'water', quantity: 1, unit: 'l' }],
        steps: ['Boil.'],
      })
      .expect(201);
    recipeId = recipe.body.id;
  });

  afterAll(async () => {
    const owners = await prisma.user.findMany({
      where: { email: { in: [ada.email, ben.email] } },
      select: { id: true, images: { select: { id: true } } },
    });
    await app
      .get(ImagesService)
      .delete(owners.flatMap((owner) => owner.images.map((image) => image.id)));
    const ids = owners.map((owner) => owner.id);
    await prisma.recipe.deleteMany({ where: { authorId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  describe('recipe photos', () => {
    let first: Photo;

    it('only lets the signed-in author upload', async () => {
      const file = await cameraPhoto(100, 100);
      await api()
        .put(`/api/v1/recipes/${recipeId}/photo`)
        .attach('photo', file, 'photo.jpg')
        .expect(401);
      await upload(`/api/v1/recipes/${recipeId}/photo`, ben, file).expect(403);
      await upload(
        '/api/v1/recipes/00000000-0000-7000-8000-000000000000/photo',
        ada,
        file,
      ).expect(404);
    });

    it('rejects a missing file, a non-image, and a file over 10 MB', async () => {
      const path = `/api/v1/recipes/${recipeId}/photo`;
      const missing = await api().put(path).set(auth(ada)).expect(400);
      expect(missing.body.message).toBe(
        'Send the image as a multipart/form-data field named "photo"',
      );

      const text = await upload(path, ada, Buffer.from('hello')).expect(400);
      expect(text.body.message).toBe('Upload a JPEG, PNG or WebP image');

      const huge = await upload(
        path,
        ada,
        Buffer.alloc(10 * 1024 * 1024 + 1),
      ).expect(413);
      expect(huge.body.message).toBe('File too large');
    });

    it('stores a resized WebP copy without the location data', async () => {
      const res = await upload(
        `/api/v1/recipes/${recipeId}/photo`,
        ada,
        await cameraPhoto(2000, 1500),
      ).expect(200);

      first = res.body.photo;
      expect(first).toEqual({
        small: expect.stringMatching(
          /^\/api\/v1\/images\/[0-9a-f-]{36}\/small$/,
        ),
        large: expect.stringMatching(
          /^\/api\/v1\/images\/[0-9a-f-]{36}\/large$/,
        ),
        width: 1600,
        height: 1200,
      });
      expect(res.body.steps).toEqual(['Boil.']);

      const large = await api()
        .get(first.large)
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(large.headers['content-type']).toBe('image/webp');
      expect(large.headers['cache-control']).toContain('immutable');
      expect(large.headers['cross-origin-resource-policy']).toBe(
        'cross-origin',
      );
      const stored = await sharp(large.body as Buffer).metadata();
      expect([stored.format, stored.width, stored.height]).toEqual([
        'webp',
        1600,
        1200,
      ]);
      expect(stored.exif).toBeUndefined();

      await api().get(first.small).expect(200);
    });

    it('shows the photo in recipe reads and lists', async () => {
      const one = await api().get(`/api/v1/recipes/${recipeId}`).expect(200);
      expect(one.body.photo).toEqual(first);

      const list = await api()
        .get('/api/v1/recipes')
        .query({ authorId: ada.id })
        .expect(200);
      expect(list.body.data[0].photo).toEqual(first);
    });

    it('replaces the photo and deletes the old files', async () => {
      const png = await sharp({
        create: { width: 300, height: 200, channels: 3, background: '#fff' },
      })
        .png()
        .toBuffer();
      const res = await upload(
        `/api/v1/recipes/${recipeId}/photo`,
        ada,
        png,
      ).expect(200);

      expect(res.body.photo.large).not.toBe(first.large);
      expect([res.body.photo.width, res.body.photo.height]).toEqual([300, 200]);
      await api().get(first.large).expect(404);
      await api().get(first.small).expect(404);
      first = res.body.photo;
    });

    it('removes the photo, and removing again is fine', async () => {
      await api()
        .delete(`/api/v1/recipes/${recipeId}/photo`)
        .set(auth(ben))
        .expect(403);
      await api()
        .delete(`/api/v1/recipes/${recipeId}/photo`)
        .set(auth(ada))
        .expect(204);
      await api()
        .delete(`/api/v1/recipes/${recipeId}/photo`)
        .set(auth(ada))
        .expect(204);

      const one = await api().get(`/api/v1/recipes/${recipeId}`).expect(200);
      expect(one.body.photo).toBeNull();
      await api().get(first.large).expect(404);
    });

    it("deletes the photo's files with the recipe", async () => {
      const res = await upload(
        `/api/v1/recipes/${recipeId}/photo`,
        ada,
        await cameraPhoto(200, 200),
      ).expect(200);
      const { large } = res.body.photo as Photo;

      await api()
        .delete(`/api/v1/recipes/${recipeId}`)
        .set(auth(ada))
        .expect(204);
      await api().get(large).expect(404);
    });
  });

  describe('profile photos', () => {
    it('lets users set their own photo, cropped square', async () => {
      await api()
        .put('/api/v1/profiles/me/photo')
        .attach('photo', await cameraPhoto(100, 100), 'photo.jpg')
        .expect(401);

      const res = await upload(
        '/api/v1/profiles/me/photo',
        ben,
        await cameraPhoto(900, 600),
      ).expect(200);
      expect(res.body).toMatchObject({
        id: ben.id,
        photo: { width: 512, height: 512 },
      });

      const profile = await api().get(`/api/v1/profiles/${ben.id}`).expect(200);
      expect(profile.body.photo).toEqual(res.body.photo);
    });

    it("shows the author's photo on their recipes", async () => {
      const recipe = await api()
        .post('/api/v1/recipes')
        .set(auth(ben))
        .send({
          title: 'E2E author photo',
          cuisine: `E2E images ${runId}`,
          minutes: 5,
          servings: 1,
          ingredients: [{ name: 'salt' }],
          steps: ['Season.'],
        })
        .expect(201);

      const profile = await api().get(`/api/v1/profiles/${ben.id}`).expect(200);
      expect(recipe.body.author.photo).toEqual(profile.body.photo);
    });

    it('removes the photo', async () => {
      const before = await api().get(`/api/v1/profiles/${ben.id}`).expect(200);
      await api()
        .delete('/api/v1/profiles/me/photo')
        .set(auth(ben))
        .expect(204);

      const after = await api().get(`/api/v1/profiles/${ben.id}`).expect(200);
      expect(after.body.photo).toBeNull();
      await api().get(before.body.photo.large).expect(404);
    });
  });

  describe('image files', () => {
    it('answer 404 for unknown images and 400 for malformed paths', async () => {
      await api()
        .get('/api/v1/images/00000000-0000-7000-8000-000000000000/large')
        .expect(404);
      await api()
        .get('/api/v1/images/00000000-0000-7000-8000-000000000000/huge')
        .expect(400);
      await api().get('/api/v1/images/not-a-uuid/large').expect(400);
    });

    it("are deleted with the owner's account", async () => {
      const res = await upload(
        '/api/v1/profiles/me/photo',
        ben,
        await cameraPhoto(300, 300),
      ).expect(200);

      await api()
        .post('/api/v1/auth/delete-account')
        .set(auth(ben))
        .send({ password })
        .expect(204);
      await api()
        .get((res.body.photo as Photo).large)
        .expect(404);
    });
  });
});
