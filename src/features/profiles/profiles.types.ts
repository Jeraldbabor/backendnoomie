import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Public profile fields only. Email, password hash, and sessions are private account data
 * and never appear in profile responses, not even your own (use GET /auth/me for those).
 */
export const profileSelect = {
  id: true,
  displayName: true,
  bio: true,
  createdAt: true,
  _count: { select: { recipes: true } },
} satisfies Prisma.UserSelect;

type ProfileRow = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

export interface ProfileView {
  id: string;
  displayName: string;
  bio: string | null;
  createdAt: Date;
  /** Recipes this user authored. */
  recipeCount: number;
}

export function toProfileView({ _count, ...profile }: ProfileRow): ProfileView {
  return { ...profile, recipeCount: _count.recipes };
}
