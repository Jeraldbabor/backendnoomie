// Runs against the database in DATABASE_URL and the storage in STORAGE_* (start both with
// `npm run docker:db`), with the real model (`npm run test:e2e` fetches it first). Deletes
// its test data, including the stored files.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { ImagesService } from '../src/features/images/images.service.js';

type Match = {
  recipe: { id: string; title: string; savedByMe: boolean };
  similarity: number;
  confidence: string;
};

const drawing = (shapes: string) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${shapes}</svg>`,
    ),
  )
    .jpeg()
    .toBuffer();
/** A drawn bowl of food. Real food photos can't live in the repository, so this stands in. */
const bowl = () =>
  drawing(
    '<rect width="512" height="512" fill="#e8d8c0"/><circle cx="256" cy="256" r="190" fill="#fff"/>' +
      '<circle cx="256" cy="256" r="150" fill="#b5651d"/><circle cx="210" cy="220" r="34" fill="#f2c14e"/>' +
      '<circle cx="300" cy="280" r="42" fill="#6b8e23"/><circle cx="290" cy="190" r="26" fill="#c0392b"/>',
  );
/** A line grid: measured at 0.68 against the bowl, safely below the 0.75 cut-off. */
const gridLines = () =>
  drawing(
    '<rect width="512" height="512" fill="#fff"/>' +
      Array.from(
        { length: 11 },
        (_, i) =>
          `<rect x="${i * 50}" width="3" height="512" fill="#333"/><rect y="${i * 50}" width="512" height="3" fill="#333"/>`,
      ).join(''),
  );

describe('Food scan (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'correct horse battery';
  const cuisine = `E2E scan ${runId}`;
  const ada = {
    email: `e2e-scan-ada-${runId}@example.test`,
    id: '',
    token: '',
  };
  const ben = {
    email: `e2e-scan-ben-${runId}@example.test`,
    id: '',
    token: '',
  };
  let dish: Buffer;
  let otherDish: Buffer;
  let recipeId: string;

  const api = () => request(app.getHttpServer());
  const auth = (user: { token: string }) => ({
    Authorization: `Bearer ${user.token}`,
  });
  const attach = { filename: 'photo.jpg', contentType: 'image/jpeg' };
  const scan = (user: { token: string }, file: Buffer) =>
    api().post('/api/v1/scan').set(auth(user)).attach('photo', file, attach);
  const postPhoto = (id: string, user: { token: string }, file: Buffer) =>
    api()
      .put(`/api/v1/recipes/${id}/photo`)
      .set(auth(user))
      .attach('photo', file, attach);
  const createRecipe = async (user: { token: string }, title: string) => {
    const res = await api()
      .post('/api/v1/recipes')
      .set(auth(user))
      .send({
        title,
        cuisine,
        minutes: 10,
        servings: 2,
        ingredients: [{ name: 'water', quantity: 1, unit: 'l' }],
        steps: ['Boil.'],
      })
      .expect(201);
    return res.body.id as string;
  };
  const foundIn = (body: { matches: Match[] }, id: string) =>
    body.matches.find((match) => match.recipe.id === id);

  beforeAll(async () => {
    dish = await bowl();
    otherDish = await gridLines();

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
    recipeId = await createRecipe(ada, 'E2E invented dish');
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

  it('needs sign-in and a real image', async () => {
    await api().post('/api/v1/scan').attach('photo', dish, attach).expect(401);

    const missing = await api().post('/api/v1/scan').set(auth(ada)).expect(400);
    expect(missing.body.message).toBe(
      'Send the image as a multipart/form-data field named "photo"',
    );
    const text = await scan(ada, Buffer.from('hello')).expect(400);
    expect(text.body.message).toBe('Upload a JPEG, PNG or WebP image');
    await scan(ada, Buffer.alloc(10 * 1024 * 1024 + 1)).expect(413);
  });

  it('does not find a dish before anyone has posted a photo of it', async () => {
    const res = await scan(ada, dish).expect(200);
    expect(foundIn(res.body, recipeId)).toBeUndefined();
  });

  it('finds a newly invented dish as soon as its photo is posted, for everyone', async () => {
    await postPhoto(recipeId, ada, dish).expect(200);

    const res = await scan(ben, dish).expect(200);

    expect(foundIn(res.body, recipeId)).toMatchObject({
      recipe: { title: 'E2E invented dish', savedByMe: false },
      similarity: 1,
      confidence: 'strong',
    });
    const [first] = res.body.matches as Match[];
    expect(first.recipe).not.toHaveProperty('steps');
  });

  it('also finds a different photo of the same dish', async () => {
    const sameDishCloser = await sharp(dish)
      .extract({ left: 30, top: 30, width: 452, height: 452 })
      .modulate({ brightness: 1.05 })
      .jpeg({ quality: 70 })
      .toBuffer();

    const res = await scan(ben, sameDishCloser).expect(200);

    expect(foundIn(res.body, recipeId)).toBeDefined();
  });

  it('does not offer a dish that looks nothing like the photo', async () => {
    const res = await scan(ben, otherDish).expect(200);
    expect(foundIn(res.body, recipeId)).toBeUndefined();
  });

  it('shows the viewer their own saved state', async () => {
    await api()
      .put(`/api/v1/saved-recipes/${recipeId}`)
      .set(auth(ben))
      .expect(204);

    const res = await scan(ben, dish).expect(200);

    expect(foundIn(res.body, recipeId)?.recipe.savedByMe).toBe(true);
  });

  it('never stores the scanned photo', async () => {
    const before = await prisma.image.count({ where: { ownerId: ben.id } });
    await scan(ben, dish).expect(200);
    expect(await prisma.image.count({ where: { ownerId: ben.id } })).toBe(
      before,
    );
  });

  it('follows the current photo when it is replaced', async () => {
    await postPhoto(recipeId, ada, otherDish).expect(200);

    expect(foundIn((await scan(ben, dish)).body, recipeId)).toBeUndefined();
    expect(foundIn((await scan(ben, otherDish)).body, recipeId)).toBeDefined();
    expect(await prisma.recipeFingerprint.count({ where: { recipeId } })).toBe(
      1,
    );
  });

  it('forgets the dish when its photo is removed', async () => {
    await api()
      .delete(`/api/v1/recipes/${recipeId}/photo`)
      .set(auth(ada))
      .expect(204);

    expect(await prisma.recipeFingerprint.count({ where: { recipeId } })).toBe(
      0,
    );
    expect(
      foundIn((await scan(ben, otherDish)).body, recipeId),
    ).toBeUndefined();
  });

  it('forgets the dish when the recipe is deleted', async () => {
    const id = await createRecipe(ada, 'E2E short-lived dish');
    await postPhoto(id, ada, dish).expect(200);
    expect(foundIn((await scan(ben, dish)).body, id)).toBeDefined();

    await api().delete(`/api/v1/recipes/${id}`).set(auth(ada)).expect(204);

    expect(foundIn((await scan(ben, dish)).body, id)).toBeUndefined();
    expect(
      await prisma.recipeFingerprint.count({ where: { recipeId: id } }),
    ).toBe(0);
  });
});
