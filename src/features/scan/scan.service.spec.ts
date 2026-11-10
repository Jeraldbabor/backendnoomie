import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import type { PrismaService } from '../../database/prisma.service.js';
import { UNSUPPORTED_IMAGE } from '../images/image-processing.js';
import { recipeSummarySelectFor } from '../recipes/recipes.types.js';
import {
  type PhotoFingerprintService,
  toModelInput,
} from './photo-fingerprint.service.js';
import {
  ALREADY_CONFIRMED,
  NOT_A_MATCH,
  POSSIBLE_MATCH,
  SCAN_NOT_FOUND,
  ScanService,
  STRONG_MATCH,
  TAUGHT_PER_RECIPE,
  TAUGHT_PER_USER_PER_RECIPE,
} from './scan.service.js';

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
  const tx = { $queryRaw: vi.fn(), $executeRaw: vi.fn() };
  const prisma = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
    recipe: { findMany: vi.fn(), findUnique: vi.fn() },
  };
  const fingerprints = { fingerprint: vi.fn() };
  let service: ScanService;
  let image: Buffer;

  /** The values a tagged-template query was called with, in order. */
  const values = (mock: ReturnType<typeof vi.fn>, call: number) =>
    mock.mock.calls[call].slice(1);
  /** The closest-recipes query returns `rows`; saving the scan returns its id. */
  const closest = (rows: { recipeId: string; similarity: number }[]) =>
    prisma.$queryRaw
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce([{ id: 'scan-1' }]);

  beforeAll(async () => {
    image = await photo('#d9822b');
  });

  beforeEach(() => {
    vi.resetAllMocks();
    fingerprints.fingerprint.mockResolvedValue([0.6, 0.8]);
    prisma.$transaction.mockImplementation(
      (run: (client: typeof tx) => unknown) => run(tx),
    );
    service = new ScanService(
      prisma as unknown as PrismaService,
      fingerprints as unknown as PhotoFingerprintService,
    );
  });

  describe('scan', () => {
    it('returns the closest recipes first, labelled by how close they are', async () => {
      closest([
        { recipeId: 'b', similarity: 0.9123 },
        { recipeId: 'a', similarity: 0.7777 },
      ]);
      // The database returns rows in any order.
      prisma.recipe.findMany.mockResolvedValue([
        recipeRow('a'),
        recipeRow('b'),
      ]);

      const { scanId, matches } = await service.scan(image, 'user-1');

      expect(scanId).toBe('scan-1');
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

    it("keeps the scan's fingerprint and what it offered, never the photo", async () => {
      closest([{ recipeId: 'a', similarity: 0.9 }]);
      prisma.recipe.findMany.mockResolvedValue([recipeRow('a')]);

      await service.scan(image, 'user-1');

      expect(values(prisma.$queryRaw, 1)).toEqual([
        'user-1',
        '[0.6,0.8]',
        ['a'],
      ]);
      // Scans past their time are deleted before a new one is saved.
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(
        (prisma.$executeRaw.mock.calls[0][0] as string[]).join(''),
      ).toContain('DELETE FROM scans');
    });

    it('treats the cut-offs as inclusive', async () => {
      closest([
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

    it('labels a match by the similarity it shows', async () => {
      closest([{ recipeId: 'a', similarity: STRONG_MATCH - 0.001 }]);
      prisma.recipe.findMany.mockResolvedValue([recipeRow('a')]);

      const { matches } = await service.scan(image, 'user-1');

      expect([matches[0].similarity, matches[0].confidence]).toEqual([
        STRONG_MATCH,
        'strong',
      ]);
    });

    it('offers nothing when no photo is similar enough, but still saves the scan', async () => {
      closest([{ recipeId: 'a', similarity: POSSIBLE_MATCH - 0.01 }]);

      await expect(service.scan(image, 'user-1')).resolves.toEqual({
        scanId: 'scan-1',
        matches: [],
      });
      expect(prisma.recipe.findMany).not.toHaveBeenCalled();
      expect(values(prisma.$queryRaw, 1)[2]).toEqual([]);
    });

    it('skips a recipe deleted between the two queries, and does not offer it', async () => {
      closest([
        { recipeId: 'gone', similarity: 0.95 },
        { recipeId: 'a', similarity: 0.9 },
      ]);
      prisma.recipe.findMany.mockResolvedValue([recipeRow('a')]);

      const { matches } = await service.scan(image, 'user-1');

      expect(matches.map(({ recipe }) => recipe.id)).toEqual(['a']);
      expect(values(prisma.$queryRaw, 1)[2]).toEqual(['a']);
    });

    it('rejects a file that is not an image before running the model', async () => {
      await expect(
        service.scan(Buffer.from('not an image'), 'user-1'),
      ).rejects.toThrow(UNSUPPORTED_IMAGE);
      expect(fingerprints.fingerprint).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    const scanOffering = (...recipeIds: string[]) =>
      prisma.$queryRaw.mockResolvedValueOnce([{ matched: recipeIds }]);
    const recipeBy = (authorId: string | null) =>
      prisma.recipe.findUnique.mockResolvedValue({ authorId });

    it("treats a missing, expired, or someone else's scan the same", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);

      await expect(service.confirm('scan-1', 'a', 'user-1')).rejects.toThrow(
        new NotFoundException(SCAN_NOT_FOUND),
      );
      // The lookup itself is limited to the user's own, recent scans.
      expect(values(prisma.$queryRaw, 0).slice(0, 2)).toEqual([
        'scan-1',
        'user-1',
      ]);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a recipe that does not exist', async () => {
      scanOffering('a');
      prisma.recipe.findUnique.mockResolvedValue(null);

      await expect(
        service.confirm('scan-1', 'missing', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("refuses someone else's recipe that the scan did not offer", async () => {
      scanOffering('a');
      recipeBy('author-2');

      await expect(service.confirm('scan-1', 'b', 'user-1')).rejects.toThrow(
        new ForbiddenException(NOT_A_MATCH),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuses an editorial recipe that the scan did not offer', async () => {
      scanOffering();
      recipeBy(null);

      await expect(
        service.confirm('scan-1', 'b', 'user-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('adds an example for a recipe the scan offered, then trims to the caps', async () => {
      scanOffering('a', 'b');
      recipeBy('author-2');
      tx.$queryRaw.mockResolvedValueOnce([{ id: 'example-1' }]);

      await service.confirm('scan-1', 'b', 'user-1');

      expect(values(tx.$queryRaw, 0)).toEqual(['b', 'user-1', 'scan-1']);
      expect(values(tx.$executeRaw, 0)).toEqual([
        'b',
        'user-1',
        TAUGHT_PER_USER_PER_RECIPE,
      ]);
      expect(values(tx.$executeRaw, 1)).toEqual(['b', TAUGHT_PER_RECIPE]);
    });

    it('lets authors teach their own recipe from any scan', async () => {
      scanOffering();
      recipeBy('user-1');
      tx.$queryRaw.mockResolvedValueOnce([{ id: 'example-1' }]);

      await expect(
        service.confirm('scan-1', 'own', 'user-1'),
      ).resolves.toBeUndefined();
      expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('changes nothing when the same scan is confirmed as the same recipe again', async () => {
      scanOffering('a');
      recipeBy('author-2');
      tx.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ recipeId: 'a' }]);

      await expect(
        service.confirm('scan-1', 'a', 'user-1'),
      ).resolves.toBeUndefined();
      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it('refuses to confirm one scan as two different recipes', async () => {
      scanOffering('a', 'b');
      recipeBy('author-2');
      tx.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ recipeId: 'a' }]);

      await expect(service.confirm('scan-1', 'b', 'user-1')).rejects.toThrow(
        new ConflictException(ALREADY_CONFIRMED),
      );
    });
  });

  describe('indexRecipePhoto', () => {
    it('stores the fingerprint for that recipe and image', async () => {
      await service.indexRecipePhoto('recipe-1', 'image-1', image);

      expect(fingerprints.fingerprint).toHaveBeenCalledWith(image);
      expect(values(prisma.$executeRaw, 0)).toEqual([
        'recipe-1',
        'image-1',
        '[0.6,0.8]',
      ]);
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
