import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  StorageService,
  type StoredObject,
} from '../../storage/storage.service.js';
import {
  IMAGE_SIZES,
  type ImageKind,
  type ImageSize,
  processImage,
} from './image-processing.js';

const fileKey = (id: string, size: ImageSize) => `images/${id}/${size}`;

/**
 * Stores and deletes uploaded images: one `images` row plus one file per size. Features attach
 * an image to their records (recipe photo, profile photo) and call `delete` when they detach it.
 */
@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Processes and stores an upload. Throws 400 for files that aren't usable images. */
  async create(
    ownerId: string,
    kind: ImageKind,
    data: Buffer,
  ): Promise<{ id: string; width: number; height: number }> {
    const { width, height, files } = await processImage(kind, data);
    const image = await this.prisma.image.create({
      data: { ownerId, width, height },
      select: { id: true, width: true, height: true },
    });
    try {
      await Promise.all(
        IMAGE_SIZES.map((size) =>
          this.storage.put(fileKey(image.id, size), files[size], 'image/webp'),
        ),
      );
    } catch (error) {
      await this.delete([image.id]);
      throw error;
    }
    return image;
  }

  /** Deletes images (rows and files). Null ids and ids that don't exist are ignored. */
  async delete(ids: (string | null | undefined)[]): Promise<void> {
    const existing = ids.filter((id): id is string => Boolean(id));
    if (existing.length === 0) {
      return;
    }
    await this.prisma.image.deleteMany({ where: { id: { in: existing } } });
    await this.deleteFiles(existing);
  }

  /**
   * Deletes only the files, for images whose rows are already gone (account deletion). A
   * storage failure is logged rather than thrown: the database change has already happened,
   * and the files are unreachable without their rows.
   */
  async deleteFiles(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    try {
      await this.storage.deleteMany(
        ids.flatMap((id) => IMAGE_SIZES.map((size) => fileKey(id, size))),
      );
    } catch (error) {
      this.logger.error(
        `Could not delete the files of ${ids.length} image(s): ${ids.join(', ')}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** The stored file for one size of an image, or null when there is none. */
  open(id: string, size: ImageSize): Promise<StoredObject | null> {
    return this.storage.get(fileKey(id, size));
  }
}
