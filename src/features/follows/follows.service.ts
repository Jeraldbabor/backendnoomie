import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CursorPage,
  CursorPaginationQueryDto,
} from '../../common/dto/cursor-pagination-query.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  profileSummarySelectFor,
  toProfileSummaryView,
} from '../profiles/profiles.types.js';
import type { FollowListItem } from './follows.types.js';

/**
 * Follow and unfollow act only for the signed-in user. Who follows whom is public, so anyone
 * can read the lists.
 */
@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Following someone twice is a no-op that keeps the original follow time. */
  async follow(followerId: string, followedId: string): Promise<void> {
    if (followerId === followedId) {
      throw new BadRequestException("You can't follow yourself");
    }
    try {
      await this.prisma.follow.upsert({
        where: { followerId_followedId: { followerId, followedId } },
        create: { followerId, followedId },
        update: {},
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2003: the user doesn't exist (foreign key). P2002: a concurrent follow won.
        if (error.code === 'P2003') {
          throw new NotFoundException('Profile not found');
        }
        if (error.code === 'P2002') {
          return;
        }
      }
      throw error;
    }
  }

  /** Unfollowing someone you don't follow is a no-op. */
  async unfollow(followerId: string, followedId: string): Promise<void> {
    await this.prisma.follow.deleteMany({ where: { followerId, followedId } });
  }

  /** Who follows `userId`, most recent first. `viewerId` only decides `followedByMe`. */
  async followers(
    userId: string,
    { cursor, limit }: CursorPaginationQueryDto,
    viewerId?: string,
  ): Promise<CursorPage<FollowListItem>> {
    await this.assertUser(userId);
    const rows = await this.prisma.follow.findMany({
      where: { followedId: userId, id: cursor ? { lt: cursor } : undefined },
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        createdAt: true,
        follower: { select: profileSummarySelectFor(viewerId) },
      },
    });
    return toPage(
      rows.map(({ id, createdAt, follower }) => ({
        id,
        createdAt,
        user: follower,
      })),
      limit,
    );
  }

  /** Who `userId` follows, most recently followed first. */
  async following(
    userId: string,
    { cursor, limit }: CursorPaginationQueryDto,
    viewerId?: string,
  ): Promise<CursorPage<FollowListItem>> {
    await this.assertUser(userId);
    const rows = await this.prisma.follow.findMany({
      where: { followerId: userId, id: cursor ? { lt: cursor } : undefined },
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        createdAt: true,
        followed: { select: profileSummarySelectFor(viewerId) },
      },
    });
    return toPage(
      rows.map(({ id, createdAt, followed }) => ({
        id,
        createdAt,
        user: followed,
      })),
      limit,
    );
  }

  /** Lists of an unknown user are 404, not an empty list. */
  private async assertUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Profile not found');
    }
  }
}

/**
 * Follow ids are UUIDv7, so ordering by id is ordering by follow time, and `id < cursor`
 * continues from the last row of the previous page. `rows` has one extra row when another
 * page exists.
 */
function toPage(
  rows: {
    id: string;
    createdAt: Date;
    user: Parameters<typeof toProfileSummaryView>[0];
  }[],
  limit: number,
): CursorPage<FollowListItem> {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    data: page.map(({ createdAt, user }) => ({
      followedAt: createdAt,
      profile: toProfileSummaryView(user),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
