// Starter dishes for the food scan: 42 common Filipino dishes as Noomie editorial recipes (no
// author), each taught to the scan with example photos from Wikimedia Commons.
//
//   npm run db:seed:dishes
//
// Needs the database, the scan model (`npm run scan:model`), and internet access the first
// time. Each photo is downloaded once, turned into a fingerprint, and discarded: only the
// fingerprint, the file name and its credit are stored. Safe to run again: recipes are matched
// by title and refreshed, and photos that already have a fingerprint are skipped.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import type { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { INGREDIENT_UNITS } from '../src/features/recipes/dto/recipe-ingredient.dto.js';
import { PhotoFingerprintService } from '../src/features/scan/photo-fingerprint.service.js';
import {
  STARTER_RECIPES,
  type StarterRecipe,
} from './starter-dishes/recipes.js';

type ExamplePhoto = { file: string; author: string; license: string };
const EXAMPLE_PHOTOS = JSON.parse(
  readFileSync(
    new URL('./starter-dishes/example-photos.json', import.meta.url),
    'utf8',
  ),
) as Record<string, ExamplePhoto[]>;

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks scripts to say who they are; no personal details.
const HEADERS = {
  'User-Agent': 'NoomieStarterDishes/1.0 (backendnoomie db:seed:dishes)',
};
/** Only licenses that allow this use. A photo whose license changed is skipped. */
const OPEN_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? [0-9.]+)$/i;
/** The model only sees 224 x 224; a 640-pixel copy is plenty and quick to download. */
const PHOTO_WIDTH = 640;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});
const fingerprints = new PhotoFingerprintService({
  get: () => 'development',
} as unknown as ConfigService<never, true>);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GETs politely: one request at a time, with pauses, and retries on rate limits. */
async function get(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    await sleep(500);
    const response = await fetch(url, { headers: HEADERS }).catch(() => null);
    if (response?.ok) return response;
    const retryable =
      !response || response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 5) {
      throw new Error(`HTTP ${response?.status ?? 'error'} for ${url}`);
    }
    await sleep(Number(response?.headers.get('retry-after') ?? 5) * 1000);
  }
}

/** Current download URL and license of each Commons file, by file name. */
async function lookUp(files: string[]) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    titles: files.map((file) => `File:${file}`).join('|'),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: String(PHOTO_WIDTH),
  });
  const data = (await (await get(`${COMMONS_API}?${params}`)).json()) as {
    query: {
      normalized?: { from: string; to: string }[];
      pages: {
        title: string;
        imageinfo?: {
          thumburl: string;
          extmetadata?: { LicenseShortName?: { value: string } };
        }[];
      }[];
    };
  };
  const renamed = new Map(
    (data.query.normalized ?? []).map(({ from, to }) => [to, from]),
  );
  const found = new Map<string, { url: string; license: string }>();
  for (const page of data.query.pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const title = renamed.get(page.title) ?? page.title;
    found.set(title.replace(/^File:/, ''), {
      url: info.thumburl,
      license: (info.extmetadata?.LicenseShortName?.value ?? '').trim(),
    });
  }
  return found;
}

async function upsertRecipe(recipe: StarterRecipe): Promise<string> {
  const { title, description, minutes, servings, steps } = recipe;
  const ingredients = recipe.ingredients.map(
    ([name, quantity, unit, note], position) => {
      if (unit && !(INGREDIENT_UNITS as readonly string[]).includes(unit)) {
        throw new Error(`${title}: unknown unit "${unit}"`);
      }
      return {
        position,
        name,
        quantity: quantity ?? null,
        unit: unit ?? null,
        note: note ?? null,
      };
    },
  );
  const data = {
    title,
    description,
    cuisine: 'Filipino',
    minutes,
    servings,
    steps,
  };
  const existing = await prisma.recipe.findFirst({
    where: { title, authorId: null },
    select: { id: true },
  });
  if (existing) {
    await prisma.recipe.update({
      where: { id: existing.id },
      data: {
        ...data,
        ingredients: { deleteMany: {}, createMany: { data: ingredients } },
      },
    });
    return existing.id;
  }
  const created = await prisma.recipe.create({
    data: { ...data, ingredients: { createMany: { data: ingredients } } },
    select: { id: true },
  });
  return created.id;
}

async function main() {
  let added = 0;
  let kept = 0;
  const problems: string[] = [];
  for (const [key, recipe] of Object.entries(STARTER_RECIPES)) {
    const photos = EXAMPLE_PHOTOS[key] ?? [];
    const recipeId = await upsertRecipe(recipe);
    const files = photos.map((photo) => photo.file);
    // Examples dropped from the list are removed.
    await prisma.recipeFingerprint.deleteMany({
      where: { recipeId, exampleFile: { not: null, notIn: files } },
    });
    const done = new Set(
      (
        await prisma.recipeFingerprint.findMany({
          where: { recipeId, exampleFile: { in: files } },
          select: { exampleFile: true },
        })
      ).map((row) => row.exampleFile),
    );
    const missing = photos.filter((photo) => !done.has(photo.file));
    kept += photos.length - missing.length;
    if (!missing.length) continue;

    const sources = await lookUp(missing.map((photo) => photo.file));
    for (const photo of missing) {
      const source = sources.get(photo.file);
      if (!source) {
        problems.push(`${recipe.title}: ${photo.file} is no longer on Commons`);
        continue;
      }
      if (!OPEN_LICENSE.test(source.license)) {
        problems.push(
          `${recipe.title}: ${photo.file} now has license "${source.license}"`,
        );
        continue;
      }
      try {
        const image = Buffer.from(await (await get(source.url)).arrayBuffer());
        const vector = `[${(await fingerprints.fingerprint(image)).join(',')}]`;
        await prisma.$executeRaw`
          INSERT INTO recipe_fingerprints (id, recipe_id, example_file, example_credit, embedding)
          VALUES (uuidv7(), ${recipeId}::uuid, ${photo.file}, ${`${photo.author}, ${source.license}`},
                  ${vector}::vector)
          ON CONFLICT (recipe_id, example_file) DO NOTHING`;
        added++;
      } catch (error) {
        problems.push(`${recipe.title}: ${photo.file}: ${String(error)}`);
      }
    }
    console.log(`${recipe.title}: ${photos.length} example photos`);
  }
  console.log(
    `Starter dishes: ${Object.keys(STARTER_RECIPES).length} recipes, ` +
      `${added} example photos added, ${kept} already there.`,
  );
  if (problems.length) {
    console.warn(`Skipped ${problems.length}:\n${problems.join('\n')}`);
  }
}

try {
  await main();
} finally {
  await fingerprints.onModuleDestroy();
  await prisma.$disconnect();
}
