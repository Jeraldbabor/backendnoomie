import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { assertUsableImage } from '../images/image-processing.js';
import {
  recipeSummarySelectFor,
  toRecipeView,
} from '../recipes/recipes.types.js';
import { PhotoFingerprintService } from './photo-fingerprint.service.js';
import type { MatchConfidence, ScanResult } from './scan.types.js';

// From a test on 419 food photos, half of the dishes never posted. At 0.85, about 1% of matches
// were wrong, but 77% of posted dishes fell below it. At 0.75, 93% of posted dishes passed, and
// so did 64% of the never-posted ones. No cut-off separates them cleanly, which is why results
// are offered as "similar recipes" for the user to pick from, never as a fact.
export const STRONG_MATCH = 0.85;
export const POSSIBLE_MATCH = 0.75;
const MAX_MATCHES = 3;

/** pgvector's text form of a fingerprint. */
const toVector = (fingerprint: number[]) => `[${fingerprint.join(',')}]`;

const confidence = (similarity: number): MatchConfidence =>
  similarity >= STRONG_MATCH ? 'strong' : 'possible';

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fingerprints: PhotoFingerprintService,
  ) {}

  /**
   * Makes a recipe photo findable by scans. Best effort: the upload has already succeeded,
   * and a photo that couldn't be fingerprinted only means scans won't find it.
   */
  async indexRecipePhoto(
    recipeId: string,
    imageId: string,
    photo: Buffer,
  ): Promise<void> {
    try {
      const vector = toVector(await this.fingerprints.fingerprint(photo));
      await this.prisma.$executeRaw`
        INSERT INTO recipe_fingerprints (id, recipe_id, image_id, embedding)
        VALUES (uuidv7(), ${recipeId}::uuid, ${imageId}::uuid, ${vector}::vector)
        ON CONFLICT (image_id) DO NOTHING`;
    } catch (error) {
      this.logger.warn(
        `Recipe ${recipeId} photo not added to the food scan: ${String(error)}`,
      );
    }
  }

  /**
   * Recipes whose photos look most like `photo`, as `viewerId` sees them. The scanned photo
   * is only read here: it isn't stored or logged.
   */
  async scan(photo: Buffer, viewerId: string): Promise<ScanResult> {
    await assertUsableImage(photo);
    const vector = toVector(await this.fingerprints.fingerprint(photo));
    // `<=>` is cosine distance, so 1 - distance is the similarity. Every fingerprint is
    // compared; that stays fast for tens of thousands of photos.
    const closest = await this.prisma.$queryRaw<
      { recipeId: string; similarity: number }[]
    >`
      SELECT recipe_id AS "recipeId",
             MAX(1 - (embedding <=> ${vector}::vector))::float8 AS similarity
      FROM recipe_fingerprints
      GROUP BY recipe_id
      ORDER BY similarity DESC, recipe_id DESC
      LIMIT ${MAX_MATCHES}`;
    const close = closest.filter((row) => row.similarity >= POSSIBLE_MATCH);
    if (close.length === 0) {
      return { matches: [] };
    }

    const recipes = await this.prisma.recipe.findMany({
      where: { id: { in: close.map((row) => row.recipeId) } },
      select: recipeSummarySelectFor(viewerId),
    });
    const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    return {
      // A recipe deleted between the two queries is skipped.
      matches: close.flatMap(({ recipeId, similarity }) => {
        const recipe = byId.get(recipeId);
        return recipe
          ? [
              {
                recipe: toRecipeView(recipe),
                similarity: Math.round(similarity * 100) / 100,
                confidence: confidence(similarity),
              },
            ]
          : [];
      }),
    };
  }
}
