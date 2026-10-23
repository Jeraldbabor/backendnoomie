import { BadRequestException } from '@nestjs/common';
import sharp, { type ResizeOptions } from 'sharp';

/** What an image is for decides its sizes. */
export type ImageKind = 'recipe' | 'profile';

export const IMAGE_SIZES = ['small', 'large'] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

/** Recipe photos keep their shape; profile photos are cropped to a centered square. */
const SIZES: Record<ImageKind, Record<ImageSize, ResizeOptions>> = {
  recipe: {
    large: {
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    },
    small: { width: 480, height: 480, fit: 'inside', withoutEnlargement: true },
  },
  profile: {
    large: { width: 512, height: 512, fit: 'cover' },
    small: { width: 128, height: 128, fit: 'cover' },
  },
};

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
/** Larger images are refused before decoding, so a small file can't expand to fill memory. */
const MAX_PIXELS = 40_000_000;

export const UNSUPPORTED_IMAGE = 'Upload a JPEG, PNG or WebP image';
export const IMAGE_TOO_LARGE = 'The image can be at most 40 megapixels';

export interface ProcessedImage {
  /** Size of the `large` file. */
  width: number;
  height: number;
  files: Record<ImageSize, Buffer>;
}

/**
 * Turns an upload into the stored files: decoded, turned upright from its camera orientation,
 * resized for `kind`, and re-encoded as WebP. Re-encoding drops all metadata, including the
 * location many phones record in photos.
 */
export async function processImage(
  kind: ImageKind,
  input: Buffer,
): Promise<ProcessedImage> {
  let format: string | undefined;
  let pixels: number;
  try {
    // Reads only the header, so the size can be checked before anything is decoded.
    const metadata = await sharp(input, { limitInputPixels: false }).metadata();
    format = metadata.format;
    pixels = (metadata.width ?? 0) * (metadata.height ?? 0);
  } catch {
    throw new BadRequestException(UNSUPPORTED_IMAGE);
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new BadRequestException(UNSUPPORTED_IMAGE);
  }
  if (pixels > MAX_PIXELS) {
    throw new BadRequestException(IMAGE_TOO_LARGE);
  }

  const render = (size: ImageSize) =>
    sharp(input, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize(SIZES[kind][size])
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
  try {
    const [large, small] = await Promise.all([
      render('large'),
      render('small'),
    ]);
    return {
      width: large.info.width,
      height: large.info.height,
      files: { large: large.data, small: small.data },
    };
  } catch {
    // Headers can look fine while the image data is broken or truncated.
    throw new BadRequestException(UNSUPPORTED_IMAGE);
  }
}
