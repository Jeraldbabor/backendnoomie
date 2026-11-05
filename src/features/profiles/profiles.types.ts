import { ANONYMOUS_VIEWER } from '../../common/anonymous-viewer.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  imageSelect,
  type ImageView,
  toImageView,
} from '../images/images.types.js';

/** Whether `viewerId` follows the user. Never reveals who else does. */
const viewerFollow = (viewerId: string | undefined) => ({
  where: { followerId: viewerId ?? ANONYMOUS_VIEWER },
  select: { id: true },
  take: 1,
});

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
  _count: { select: { recipes: true, followers: true, following: true } },
} satisfies Prisma.UserSelect;

/** A profile as `viewerId` sees it. Pass undefined for anonymous requests. */
export function profileSelectFor(viewerId: string | undefined) {
  return {
    ...profileSelect,
    followers: viewerFollow(viewerId),
  } satisfies Prisma.UserSelect;
}

type ProfileRow = Prisma.UserGetPayload<{
  select: ReturnType<typeof profileSelectFor>;
}>;

export interface ProfileView {
  id: string;
  displayName: string;
  bio: string | null;
  /** Null when the user hasn't added a photo. */
  photo: ImageView | null;
  createdAt: Date;
  /** Recipes this user authored. */
  recipeCount: number;
  followerCount: number;
  followingCount: number;
  /** Whether the signed-in viewer follows this user; false when anonymous or for yourself. */
  followedByMe: boolean;
}

export function toProfileView({
  _count,
  photo,
  followers,
  ...profile
}: ProfileRow): ProfileView {
  return {
    ...profile,
    photo: toImageView(photo),
    recipeCount: _count.recipes,
    followerCount: _count.followers,
    followingCount: _count.following,
    followedByMe: followers.length > 0,
  };
}

/** A user in a list (followers, following): enough for a row with a follow button. */
export function profileSummarySelectFor(viewerId: string | undefined) {
  return {
    id: true,
    displayName: true,
    photo: { select: imageSelect },
    followers: viewerFollow(viewerId),
  } satisfies Prisma.UserSelect;
}

type ProfileSummaryRow = Prisma.UserGetPayload<{
  select: ReturnType<typeof profileSummarySelectFor>;
}>;

export interface ProfileSummaryView {
  id: string;
  displayName: string;
  photo: ImageView | null;
  followedByMe: boolean;
}

export function toProfileSummaryView({
  photo,
  followers,
  ...profile
}: ProfileSummaryRow): ProfileSummaryView {
  return {
    ...profile,
    photo: toImageView(photo),
    followedByMe: followers.length > 0,
  };
}
