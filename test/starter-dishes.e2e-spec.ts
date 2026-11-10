// Runs against the database in DATABASE_URL, with the real model. Starter dishes are found by
// example-photo fingerprints (example_file rows), the third source next to recipe photos and
// taught scans. Deletes its test data.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { PhotoFingerprintService } from '../src/features/scan/photo-fingerprint.service.js';

type Match = { recipe: { id: string; author: unknown }; confidence: string };

/** A drawn dish no real food photo looks like: a teal plate of yellow and purple squares. */
const examplePhoto = () =>
  sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">' +
        '<rect width="512" height="512" fill="#0b6e6e"/><circle cx="256" cy="256" r="200" fill="#e0f7f7"/>' +
        '<rect x="140" y="140" width="110" height="110" fill="#f5c400"/><rect x="262" y="262" width="110" height="110" fill="#6a1b9a"/>' +
        '</svg>',
    ),
  )
    .jpeg()
    .toBuffer();

describe('Starter dish example photos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const runId = Date.now();
  const user = { email: `e2e-starter-${runId}@example.test`, token: '' };
  let recipeId: string;
  let photo: Buffer;
  let vector: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: user.email,
        password: 'correct horse battery',
        displayName: 'Cook',
      })
      .expect(201);
    user.token = registered.body.token;

    // An editorial recipe, as `npm run db:seed:dishes` creates them.
    recipeId = (
      await prisma.recipe.create({
        data: {
          title: `E2E starter dish ${runId}`,
          cuisine: `E2E starter ${runId}`,
          minutes: 10,
          servings: 2,
          steps: ['Serve.'],
          ingredients: {
            create: [{ position: 0, name: 'rice', quantity: 200, unit: 'g' }],
          },
        },
        select: { id: true },
      })
    ).id;
    photo = await examplePhoto();
    vector = `[${(await app.get(PhotoFingerprintService).fingerprint(photo)).join(',')}]`;
  });

  afterAll(async () => {
    await prisma.recipe.deleteMany({ where: { id: recipeId } });
    await prisma.user.deleteMany({ where: { email: user.email } });
    await app.close();
  });

  const scan = () =>
    request(app.getHttpServer())
      .post('/api/v1/scan')
      .set({ Authorization: `Bearer ${user.token}` })
      .attach('photo', photo, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

  it('finds an editorial recipe by its example photo, which has no recipe photo', async () => {
    const before = await scan();
    expect(before.body.matches.map((m: Match) => m.recipe.id)).not.toContain(
      recipeId,
    );

    await prisma.$executeRaw`
      INSERT INTO recipe_fingerprints (id, recipe_id, example_file, example_credit, embedding)
      VALUES (uuidv7(), ${recipeId}::uuid, 'E2E example.jpg', 'E2E author, CC0', ${vector}::vector)`;

    const after = await scan();
    expect(after.body.matches[0]).toMatchObject({
      recipe: { id: recipeId, author: null, photo: null },
      similarity: 1,
      confidence: 'strong',
    });
  });

  it('keeps one example per file and recipe, and one source per fingerprint', async () => {
    await expect(prisma.$executeRaw`
      INSERT INTO recipe_fingerprints (id, recipe_id, example_file, example_credit, embedding)
      VALUES (uuidv7(), ${recipeId}::uuid, 'E2E example.jpg', 'E2E author, CC0', ${vector}::vector)`).rejects.toThrow();
    // An example without a credit, and an example that also claims a taught scan.
    await expect(prisma.$executeRaw`
      INSERT INTO recipe_fingerprints (id, recipe_id, example_file, embedding)
      VALUES (uuidv7(), ${recipeId}::uuid, 'E2E other.jpg', ${vector}::vector)`).rejects.toThrow(
      /recipe_fingerprints_one_source/,
    );
    await expect(prisma.$executeRaw`
      INSERT INTO recipe_fingerprints (id, recipe_id, example_file, example_credit, scan_id, embedding)
      VALUES (uuidv7(), ${recipeId}::uuid, 'E2E third.jpg', 'E2E author, CC0', uuidv7(), ${vector}::vector)`).rejects.toThrow(
      /recipe_fingerprints_one_source/,
    );
  });

  it('removes the examples with their recipe', async () => {
    await prisma.recipe.delete({ where: { id: recipeId } });
    const left = await prisma.recipeFingerprint.count({ where: { recipeId } });
    expect(left).toBe(0);
  });
});
