import type { Prisma } from '../../generated/prisma/client.js';
import {
  imageSelect,
  type ImageView,
  toImageView,
} from '../images/images.types.js';

/**
 * Public profile fields only. Email, password hash, and sessions are private account data
 * and never appear in profile responses, not even your own (use GET /auth/me for those).
 */
export const profileSelect = {
  id: true,
  displayName: true,
  bio: true,
  photo: { select: imageSelect },
  createdAt: true,
  _count: { select: { recipes: true } },
} satisfies Prisma.UserSelect;

type ProfileRow = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

export interface ProfileView {
  id: string;
  displayName: string;
  bio: string | null;
  /** Null when the user hasn't added a photo. */
  photo: ImageView | null;
  createdAt: Date;
  /** Recipes this user authored. */
  recipeCount: number;
}

export function toProfileView({
  _count,
  photo,
  ...profile
}: ProfileRow): ProfileView {
  return {
    ...profile,
    photo: toImageView(photo),
    recipeCount: _count.recipes,
  };
}
