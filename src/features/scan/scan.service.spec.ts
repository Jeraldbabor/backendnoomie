import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import type { PrismaService } from '../../database/prisma.service.js';
import { UNSUPPORTED_IMAGE } from '../images/image-processing.js';
import { recipeSummarySelectFor } from '../recipes/recipes.types.js';
import {
  type PhotoFingerprintService,
  toModelInput,
} from './photo-fingerprint.service.js';
import { POSSIBLE_MATCH, ScanService, STRONG_MATCH } from './scan.service.js';

const recipeRow = (id: string) => ({
  id,
  title: `Recipe ${id}`,
  description: null,
  cuisine: 'Test',
  minutes: 10,
  servings: 2,
  ingredients: [],
  photo: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  author: null,
  saves: [],
});
const photo = (colour: string, width = 300, height = 200) =>
  sharp({
    create: { width, height, channels: 3, background: colour },
  })
    .jpeg()
    .toBuffer();

describe('toModelInput', () => {
  const SIZE = 224 * 224;

  it('gives the model one normalized plane per color, whatever the photo size', async () => {
    const input = await toModelInput(await photo('#ffffff', 900, 300));

    expect(input).toHaveLength(3 * SIZE);
    // White is 1 before normalizing: (1 - mean) / std for each color.
    expect(input[0]).toBeCloseTo((1 - 0.48145466) / 0.26862954, 1);
    expect(input[SIZE]).toBeCloseTo((1 - 0.4578275) / 0.26130258, 1);
    expect(input[2 * SIZE]).toBeCloseTo((1 - 0.40821073) / 0.27577711, 1);
  });

  it('reads red as red, not as another color', async () => {
    const input = await toModelInput(await photo('#ff0000'));

    expect(input[0]).toBeGreaterThan(1.5);
    expect(input[SIZE]).toBeLessThan(-1);
    expect(input[2 * SIZE]).toBeLessThan(-1);
  });

  it('accepts black-and-white photos and photos with transparency', async () => {
    const gray = await sharp({
      create: { width: 50, height: 50, channels: 3, background: '#808080' },
    })
      .toColourspace('b-w')
      .png()
      .toBuffer();
    const clear = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();

    expect(await toModelInput(gray)).toHaveLength(3 * SIZE);
    expect(await toModelInput(clear)).toHaveLength(3 * SIZE);
  });

  it('rejects files that are not images', async () => {
    await expect(toModelInput(Buffer.from('not an image'))).rejects.toThrow(
      new BadRequestException(UNSUPPORTED_IMAGE),
    );
  });
});

describe('ScanService', () => {
  const prisma = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    recipe: { findMany: vi.fn() },
  };
  const fingerprints = { fingerprint: vi.fn() };
  let service: ScanService;
  let image: Buffer;

  beforeAll(async () => {
    image = await photo('#d9822b');
  });

  beforeEach(() => {
    vi.resetAllMocks();
    fingerprints.fingerprint.mockResolvedValue([0.6, 0.8]);
    service = new ScanService(
      prisma as unknown as PrismaService,
      fingerprints as unknown as PhotoFingerprintService,
    );
  });

  describe('scan', () => {
    it('returns the closest recipes first, labelled by how close they are', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { recipeId: 'b', similarity: 0.9123 },
        { recipeId: 'a', similarity: 0.7777 },
      ]);
      // The database returns rows in any order.
      prisma.recipe.findMany.mockResolvedValue([
        recipeRow('a'),
        recipeRow('b'),
      ]);

      const { matches } = await service.scan(image, 'user-1');

      expect(
        matches.map(({ recipe, similarity, confidence }) => [
          recipe.id,
          similarity,
          confidence,
        ]),
      ).toEqual([
        ['b', 0.91, 'strong'],
        ['a', 0.78, 'possible'],
      ]);
      expect(matches[0].recipe).not.toHaveProperty('saves');
      expect(prisma.recipe.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['b', 'a'] } },
        select: recipeSummarySelectFor('user-1'),
      });
    });

    it('treats the cut-offs as inclusive', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { recipeId: 'b', similarity: STRONG_MATCH },
        { recipeId: 'a', similarity: POSSIBLE_MATCH },
      ]);
      prisma.recipe.findMany.mockResolvedValue([
        recipeRow('a'),
        recipeRow('b'),
      ]);

      const { matches } = await service.scan(image, 'user-1');

      expect(matches.map((match) => match.confidence)).toEqual([
        'strong',
        'possible',
      ]);
    });

    it('offers nothing when no photo is similar enough', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { recipeId: 'a', similarity: POSSIBLE_MATCH - 0.01 },
      ]);

      await expect(service.scan(image, 'user-1')).resolves.toEqual({
        matches: [],
      });
      expect(prisma.recipe.findMany).not.toHaveBeenCalled();
    });

    it('skips a recipe deleted between the two queries', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { recipeId: 'gone', similarity: 0.95 },
        { recipeId: 'a', similarity: 0.9 },
      ]);
      prisma.recipe.findMany.mockResolvedValue([recipeRow('a')]);

      const { matches } = await service.scan(image, 'user-1');

      expect(matches.map(({ recipe }) => recipe.id)).toEqual(['a']);
    });

    it('rejects a file that is not an image before running the model', async () => {
      await expect(
        service.scan(Buffer.from('not an image'), 'user-1'),
      ).rejects.toThrow(UNSUPPORTED_IMAGE);
      expect(fingerprints.fingerprint).not.toHaveBeenCalled();
    });
  });

  describe('indexRecipePhoto', () => {
    it('stores the fingerprint for that recipe and image', async () => {
      await service.indexRecipePhoto('recipe-1', 'image-1', image);

      expect(fingerprints.fingerprint).toHaveBeenCalledWith(image);
      const [, ...values] = prisma.$executeRaw.mock.calls[0];
      expect(values).toEqual(['recipe-1', 'image-1', '[0.6,0.8]']);
    });

    it('never fails the upload when the model is unavailable', async () => {
      fingerprints.fingerprint.mockRejectedValue(new Error('no model'));

      await expect(
        service.indexRecipePhoto('recipe-1', 'image-1', image),
      ).resolves.toBeUndefined();
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('never fails the upload when the database write fails', async () => {
      prisma.$executeRaw.mockRejectedValue(new Error('deadlock'));

      await expect(
        service.indexRecipePhoto('recipe-1', 'image-1', image),
      ).resolves.toBeUndefined();
    });
  });
});
