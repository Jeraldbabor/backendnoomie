import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CursorPaginationQueryDto } from '../../common/dto/cursor-pagination-query.dto.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { profileSummarySelectFor } from '../profiles/profiles.types.js';
import { FollowsService } from './follows.service.js';

const followedAt = new Date('2026-03-01T00:00:00Z');
const user = (id: string, followedByViewer = false) => ({
  id,
  displayName: `User ${id}`,
  photo: null,
  followers: followedByViewer ? [{ id: 'follow-x' }] : [],
});
const page = (overrides: Partial<CursorPaginationQueryDto> = {}) =>
  Object.assign(new CursorPaginationQueryDto(), overrides);
const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('failed', {
    code,
    clientVersion: 'test',
  });

describe('FollowsService', () => {
  const prisma = {
    follow: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  };
  let service: FollowsService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new FollowsService(prisma as unknown as PrismaService);
  });

  describe('follow', () => {
    it('records the signed-in user as the follower, once', async () => {
      await service.follow('ada', 'ben');

      expect(prisma.follow.upsert).toHaveBeenCalledWith({
        where: {
          followerId_followedId: { followerId: 'ada', followedId: 'ben' },
        },
        create: { followerId: 'ada', followedId: 'ben' },
        update: {},
      });
    });

    it('refuses to follow yourself before touching the database', async () => {
      await expect(service.follow('ada', 'ada')).rejects.toThrow(
        new BadRequestException("You can't follow yourself"),
      );
      expect(prisma.follow.upsert).not.toHaveBeenCalled();
    });

    it('reports an unknown user as not found', async () => {
      prisma.follow.upsert.mockRejectedValue(prismaError('P2003'));

      await expect(service.follow('ada', 'ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('treats a follow that raced with another as done', async () => {
      prisma.follow.upsert.mockRejectedValue(prismaError('P2002'));

      await expect(service.follow('ada', 'ben')).resolves.toBeUndefined();
    });
  });

  it("unfollow only removes the signed-in user's own follow", async () => {
    await service.unfollow('ada', 'ben');

    expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
      where: { followerId: 'ada', followedId: 'ben' },
    });
  });

  describe('lists', () => {
    beforeEach(() => prisma.user.findUnique.mockResolvedValue({ id: 'ben' }));

    it("pages a user's followers, newest first, as the viewer sees them", async () => {
      prisma.follow.findMany.mockResolvedValue([
        { id: 'f3', createdAt: followedAt, follower: user('cat', true) },
        { id: 'f2', createdAt: followedAt, follower: user('ada') },
        { id: 'f1', createdAt: followedAt, follower: user('dan') },
      ]);

      const result = await service.followers(
        'ben',
        page({ limit: 2, cursor: 'f9' }),
        'viewer-1',
      );

      expect(prisma.follow.findMany).toHaveBeenCalledWith({
        where: { followedId: 'ben', id: { lt: 'f9' } },
        orderBy: { id: 'desc' },
        take: 3,
        select: {
          id: true,
          createdAt: true,
          follower: { select: profileSummarySelectFor('viewer-1') },
        },
      });
      expect(result).toEqual({
        data: [
          {
            followedAt,
            profile: {
              id: 'cat',
              displayName: 'User cat',
              photo: null,
              followedByMe: true,
            },
          },
          {
            followedAt,
            profile: {
              id: 'ada',
              displayName: 'User ada',
              photo: null,
              followedByMe: false,
            },
          },
        ],
        nextCursor: 'f2',
      });
    });

    it('lists who a user follows', async () => {
      prisma.follow.findMany.mockResolvedValue([
        { id: 'f1', createdAt: followedAt, followed: user('cat') },
      ]);

      const result = await service.following('ben', page());

      expect(prisma.follow.findMany.mock.calls[0][0].where).toEqual({
        followerId: 'ben',
        id: undefined,
      });
      expect(result.data.map((item) => item.profile.id)).toEqual(['cat']);
      expect(result.nextCursor).toBeNull();
    });

    it('reports an unknown user as not found instead of an empty list', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.followers('ghost', page())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.follow.findMany).not.toHaveBeenCalled();
    });
  });
});
