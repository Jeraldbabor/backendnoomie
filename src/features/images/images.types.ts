import type { Prisma } from '../../generated/prisma/client.js';
import type { ImageSize } from './image-processing.js';

/** The image fields other features select, to turn into an ImageView. */
export const imageSelect = {
  id: true,
  width: true,
  height: true,
} satisfies Prisma.ImageSelect;

type ImageRow = Prisma.ImageGetPayload<{ select: typeof imageSelect }>;

/**
 * An image in API responses. The URLs are paths on this API (`/api/v1/images/...`); a later
 * setup may return absolute URLs (a CDN), so the app resolves them against the API origin.
 */
export interface ImageView {
  small: string;
  large: string;
  /** Size of `large` in pixels; `small` has the same shape. */
  width: number;
  height: number;
}

export const imagePath = (id: string, size: ImageSize) =>
  `/api/v1/images/${id}/${size}`;

export function toImageView(image: ImageRow | null): ImageView | null {
  return (
    image && {
      small: imagePath(image.id, 'small'),
      large: imagePath(image.id, 'large'),
      width: image.width,
      height: image.height,
    }
  );
}
