import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { assertUsableImage } from '../images/image-processing.js';
import {
  recipeSummarySelectFor,
  toRecipeView,
} from '../recipes/recipes.types.js';
import { PhotoFingerprintService } from './photo-fingerprint.service.js';
import type { MatchConfidence, ScanMatch, ScanResult } from './scan.types.js';

// From a test on 419 food photos, half of the dishes never posted. At 0.85, about 1% of matches
// were wrong, but 77% of posted dishes fell below it. At 0.75, 93% of posted dishes passed, and
// so did 64% of the never-posted ones. No cut-off separates them cleanly, which is why results
// are offered as "similar recipes" for the user to pick from, never as a fact.
export const STRONG_MATCH = 0.85;
export const POSSIBLE_MATCH = 0.75;
const MAX_MATCHES = 3;

/** How long a scan can be confirmed. Its fingerprint is deleted after that. */
export const SCAN_TTL_MINUTES = 60;
// Taught examples kept, newest first. Recipe photos don't count toward either limit. Caps keep
// one person, or one busy recipe, from crowding out every other example of a dish.
export const TAUGHT_PER_USER_PER_RECIPE = 3;
export const TAUGHT_PER_RECIPE = 20;

export const SCAN_NOT_FOUND = 'Scan not found or expired';
export const NOT_A_MATCH =
  "You can confirm one of this scan's matches, or a recipe of your own";
export const ALREADY_CONFIRMED =
  'This scan was already confirmed as another recipe';

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
   * Recipes whose photos look most like `photo`, as `viewerId` sees them. The photo itself
   * isn't stored or logged; its fingerprint is kept for SCAN_TTL_MINUTES so the user can
   * confirm which recipe it was.
   */
  async scan(photo: Buffer, viewerId: string): Promise<ScanResult> {
    await assertUsableImage(photo);
    const vector = toVector(await this.fingerprints.fingerprint(photo));
    // `<=>` is cosine distance, so 1 - distance is the similarity. A recipe's score is its
    // closest fingerprint: its photo or any taught example. Every row is compared; that
    // stays fast for tens of thousands of rows.
    const closest = await this.prisma.$queryRaw<
      { recipeId: string; similarity: number }[]
    >`
      SELECT recipe_id AS "recipeId",
             MAX(1 - (embedding <=> ${vector}::vector))::float8 AS similarity
      FROM recipe_fingerprints
      GROUP BY recipe_id
      ORDER BY similarity DESC, recipe_id DESC
      LIMIT ${MAX_MATCHES}`;
    const matches = await this.toMatches(
      closest.filter((row) => row.similarity >= POSSIBLE_MATCH),
      viewerId,
    );
    const scanId = await this.saveScan(
      viewerId,
      vector,
      matches.map((match) => match.recipe.id),
    );
    return { scanId, matches };
  }

  /**
   * Stores the scan's fingerprint as one more example of `recipeId`, which makes that dish
   * easier to find from photos like this one. Only the scan's own user can confirm it, and
   * only as one of its matches or as a recipe they wrote. Confirming again changes nothing.
   */
  async confirm(
    scanId: string,
    recipeId: string,
    userId: string,
  ): Promise<void> {
    const [scan] = await this.prisma.$queryRaw<{ matched: string[] | null }[]>`
      SELECT matched_recipe_ids AS matched
      FROM scans
      WHERE id = ${scanId}::uuid
        AND user_id = ${userId}::uuid
        AND created_at > now() - ${SCAN_TTL_MINUTES} * interval '1 minute'`;
    if (!scan) {
      throw new NotFoundException(SCAN_NOT_FOUND);
    }
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { authorId: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${recipeId} not found`);
    }
    if (
      !(scan.matched ?? []).includes(recipeId) &&
      recipe.authorId !== userId
    ) {
      throw new ForbiddenException(NOT_A_MATCH);
    }

    await this.prisma.$transaction(async (tx) => {
      const added = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO recipe_fingerprints (id, recipe_id, taught_by_id, scan_id, embedding)
        SELECT uuidv7(), ${recipeId}::uuid, ${userId}::uuid, s.id, s.embedding
        FROM scans s
        WHERE s.id = ${scanId}::uuid
        ON CONFLICT (scan_id) DO NOTHING
        RETURNING id`;
      if (added.length === 0) {
        const [earlier] = await tx.$queryRaw<{ recipeId: string }[]>`
          SELECT recipe_id AS "recipeId" FROM recipe_fingerprints
          WHERE scan_id = ${scanId}::uuid`;
        if (earlier && earlier.recipeId !== recipeId) {
          throw new ConflictException(ALREADY_CONFIRMED);
        }
        return;
      }
      // UUIDv7 ids are time-ordered, so OFFSET skips the newest ones and deletes the rest.
      await tx.$executeRaw`
        DELETE FROM recipe_fingerprints WHERE id IN (
          SELECT id FROM recipe_fingerprints
          WHERE recipe_id = ${recipeId}::uuid AND taught_by_id = ${userId}::uuid
          ORDER BY id DESC OFFSET ${TAUGHT_PER_USER_PER_RECIPE})`;
      await tx.$executeRaw`
        DELETE FROM recipe_fingerprints WHERE id IN (
          SELECT id FROM recipe_fingerprints
          WHERE recipe_id = ${recipeId}::uuid AND taught_by_id IS NOT NULL
          ORDER BY id DESC OFFSET ${TAUGHT_PER_RECIPE})`;
    });
  }

  /** Loads the recipes for `close`, in order. A recipe deleted meanwhile is skipped. */
  private async toMatches(
    close: { recipeId: string; similarity: number }[],
    viewerId: string,
  ): Promise<ScanMatch[]> {
    if (close.length === 0) {
      return [];
    }
    const recipes = await this.prisma.recipe.findMany({
      where: { id: { in: close.map((row) => row.recipeId) } },
      select: recipeSummarySelectFor(viewerId),
    });
    const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    return close.flatMap(({ recipeId, similarity }) => {
      const recipe = byId.get(recipeId);
      // The label follows the number the user sees, so 0.849 is shown as "0.85, strong".
      const shown = Math.round(similarity * 100) / 100;
      return recipe
        ? [
            {
              recipe: toRecipeView(recipe),
              similarity: shown,
              confidence: confidence(shown),
            },
          ]
        : [];
    });
  }

  /** Keeps the scan's fingerprint for confirming, and drops the ones past their time. */
  private async saveScan(
    userId: string,
    vector: string,
    matchedRecipeIds: string[],
  ): Promise<string> {
    await this.prisma.$executeRaw`
      DELETE FROM scans
      WHERE created_at < now() - ${SCAN_TTL_MINUTES} * interval '1 minute'`;
    const [saved] = await this.prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO scans (id, user_id, embedding, matched_recipe_ids)
      VALUES (uuidv7(), ${userId}::uuid, ${vector}::vector, ${matchedRecipeIds}::uuid[])
      RETURNING id`;
    return saved.id;
  }
}
