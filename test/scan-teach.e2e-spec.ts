// Teaching the food scan: confirming which recipe a scan showed. Runs against the database in
// DATABASE_URL and the storage in STORAGE_* (start both with `npm run docker:db`), with the
// real model. Deletes its test data, including the stored files.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { ImagesService } from '../src/features/images/images.service.js';

type Match = { recipe: { id: string }; similarity: number; confidence: string };
type User = { email: string; id: string; token: string };

const drawing = (shapes: string) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${shapes}</svg>`,
    ),
  )
    .jpeg()
    .toBuffer();
/** A drawn bowl of food, standing in for a real food photo. */
const bowl = () =>
  drawing(
    '<rect width="512" height="512" fill="#e8d8c0"/><circle cx="256" cy="256" r="190" fill="#fff"/>' +
      '<circle cx="256" cy="256" r="150" fill="#b5651d"/><circle cx="210" cy="220" r="34" fill="#f2c14e"/>' +
      '<circle cx="300" cy="280" r="42" fill="#6b8e23"/><circle cx="290" cy="190" r="26" fill="#c0392b"/>',
  );
/** A line grid: measured at 0.68 against the bowl, below the 0.75 cut-off. */
const gridLines = () =>
  drawing(
    '<rect width="512" height="512" fill="#fff"/>' +
      Array.from(
        { length: 11 },
        (_, i) =>
          `<rect x="${i * 50}" width="3" height="512" fill="#333"/><rect y="${i * 50}" width="512" height="3" fill="#333"/>`,
      ).join(''),
  );

describe('Teaching the food scan (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const password = 'correct horse battery';
  const cuisine = `E2E scan teach ${runId}`;
  const [ada, ben] = ['ada', 'ben'].map((name): User => ({
    email: `e2e-teach-${name}-${runId}@example.test`,
    id: '',
    token: '',
  }));
  let dish: Buffer;
  let otherDish: Buffer;
  let sameDishCloser: Buffer;
  let adasRecipe: string;

  const api = () => request(app.getHttpServer());
  const auth = (user: User) => ({ Authorization: `Bearer ${user.token}` });
  const attach = { filename: 'photo.jpg', contentType: 'image/jpeg' };
  const scan = async (user: User, file: Buffer) => {
    const res = await api()
      .post('/api/v1/scan')
      .set(auth(user))
      .attach('photo', file, attach)
      .expect(200);
    return res.body as { scanId: string; matches: Match[] };
  };
  const confirm = (user: User, scanId: string, recipeId: string) =>
    api()
      .post(`/api/v1/scan/${scanId}/confirm`)
      .set(auth(user))
      .send({ recipeId });
  const createRecipe = async (user: User, title: string) => {
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
  const similarityTo = (body: { matches: Match[] }, id: string) =>
    body.matches.find((match) => match.recipe.id === id)?.similarity;
  const taught = (recipeId: string, user?: User) =>
    prisma.recipeFingerprint.count({
      where: {
        recipeId,
        ...(user ? { taughtById: user.id } : { taughtById: { not: null } }),
      },
    });

  beforeAll(async () => {
    dish = await bowl();
    otherDish = await gridLines();
    sameDishCloser = await sharp(dish)
      .extract({ left: 30, top: 30, width: 452, height: 452 })
      .modulate({ brightness: 1.05 })
      .jpeg({ quality: 70 })
      .toBuffer();

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
    adasRecipe = await createRecipe(ada, 'E2E taught dish');
    await api()
      .put(`/api/v1/recipes/${adasRecipe}/photo`)
      .set(auth(ada))
      .attach('photo', dish, attach)
      .expect(200);
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

  it('gives every scan an id, and keeps only its fingerprint', async () => {
    const before = await prisma.image.count({ where: { ownerId: ben.id } });

    const { scanId } = await scan(ben, sameDishCloser);

    expect(scanId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await prisma.scan.count({ where: { id: scanId } })).toBe(1);
    expect(await prisma.image.count({ where: { ownerId: ben.id } })).toBe(
      before,
    );
  });

  it('learns a photo once a user confirms it, so the next scan finds it more surely', async () => {
    const first = await scan(ben, sameDishCloser);
    const before = similarityTo(first, adasRecipe);
    expect(before).toBeDefined();
    expect(before).toBeLessThan(1);

    await confirm(ben, first.scanId, adasRecipe).expect(204);

    const after = await scan(ben, sameDishCloser);
    expect(similarityTo(after, adasRecipe)).toBe(1);
    expect(await taught(adasRecipe, ben)).toBe(1);
  });

  it('changes nothing when the same confirmation is sent again', async () => {
    const { scanId } = await scan(ben, sameDishCloser);
    await confirm(ben, scanId, adasRecipe).expect(204);
    const count = await taught(adasRecipe, ben);

    await confirm(ben, scanId, adasRecipe).expect(204);

    expect(await taught(adasRecipe, ben)).toBe(count);
  });

  it("refuses a recipe the scan didn't offer, unless it's your own", async () => {
    const { scanId, matches } = await scan(ben, otherDish);
    expect(similarityTo({ matches }, adasRecipe)).toBeUndefined();

    const refused = await confirm(ben, scanId, adasRecipe).expect(403);
    expect(refused.body.message).toBe(
      "You can confirm one of this scan's matches, or a recipe of your own",
    );

    // Ada can teach her own dish from a photo the scan didn't connect to it.
    const own = await scan(ada, otherDish);
    await confirm(ada, own.scanId, adasRecipe).expect(204);
    expect(similarityTo(await scan(ben, otherDish), adasRecipe)).toBe(1);
  });

  it("refuses one scan as two different recipes, and someone else's scan", async () => {
    const bensRecipe = await createRecipe(ben, 'E2E second dish');
    const { scanId } = await scan(ben, sameDishCloser);
    await confirm(ben, scanId, adasRecipe).expect(204);

    const twice = await confirm(ben, scanId, bensRecipe).expect(409);
    expect(twice.body.message).toBe(
      'This scan was already confirmed as another recipe',
    );

    const notYours = await confirm(ada, scanId, adasRecipe).expect(404);
    expect(notYours.body.message).toBe('Scan not found or expired');
  });

  it('expires a scan after an hour', async () => {
    const { scanId } = await scan(ben, sameDishCloser);
    await prisma.scan.update({
      where: { id: scanId },
      data: { createdAt: new Date(Date.now() - 61 * 60_000) },
    });

    await confirm(ben, scanId, adasRecipe).expect(404);
  });

  it('keeps each person to their newest 3 examples of a recipe', async () => {
    for (let i = 0; i < 4; i++) {
      const variant = await sharp(dish)
        .extract({ left: 20 + i * 8, top: 20, width: 440, height: 440 })
        .jpeg()
        .toBuffer();
      const { scanId } = await scan(ben, variant);
      await confirm(ben, scanId, adasRecipe).expect(204);
    }

    expect(await taught(adasRecipe, ben)).toBe(3);
  });

  it('checks the ids and needs sign-in', async () => {
    const { scanId } = await scan(ben, sameDishCloser);
    await api()
      .post(`/api/v1/scan/${scanId}/confirm`)
      .send({ recipeId: adasRecipe })
      .expect(401);
    const badRecipe = await confirm(ben, scanId, 'not-a-uuid').expect(400);
    expect(badRecipe.body.message).toEqual(['recipeId must be a UUID']);
    await confirm(ben, 'not-a-uuid', adasRecipe).expect(400);
    await confirm(ben, scanId, '00000000-0000-7000-8000-000000000000').expect(
      404,
    );
  });

  it("forgets a user's examples and scans when they delete their account", async () => {
    expect(await taught(adasRecipe, ben)).toBeGreaterThan(0);

    await api()
      .post('/api/v1/auth/delete-account')
      .set(auth(ben))
      .send({ password })
      .expect(204);

    expect(await taught(adasRecipe, ben)).toBe(0);
    expect(await prisma.scan.count({ where: { userId: ben.id } })).toBe(0);
    // Ada's own photo and her own example stay.
    expect(await taught(adasRecipe, ada)).toBe(1);
  });
});
