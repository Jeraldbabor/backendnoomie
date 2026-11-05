import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service.js';
import type { ImagesService } from '../images/images.service.js';
import { ProfilesService } from './profiles.service.js';
import { profileSelect, profileSelectFor } from './profiles.types.js';

const row = {
  id: 'user-1',
  displayName: 'Ada',
  bio: 'Home cook.',
  photo: { id: 'img-1', width: 512, height: 512 },
  createdAt: new Date('2026-01-01'),
  _count: { recipes: 2, followers: 3, following: 1 },
  // The viewer's own follow of this user, if any.
  followers: [] as { id: string }[],
};

describe('ProfilesService', () => {
  const prisma = { user: { findUnique: vi.fn(), update: vi.fn() } };
  let service: ProfilesService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new ProfilesService(
      prisma as unknown as PrismaService,
      {} as ImagesService,
    );
  });

  it('selects public fields only', () => {
    expect(Object.keys(profileSelect).sort()).toEqual(
      ['_count', 'bio', 'createdAt', 'displayName', 'id', 'photo'].sort(),
    );
  });

  it("only ever looks up the viewer's own follow", () => {
    expect(profileSelectFor('viewer-1').followers.where).toEqual({
      followerId: 'viewer-1',
    });
    expect(profileSelectFor(undefined).followers.where.followerId).toBe(
      '00000000-0000-0000-0000-000000000000',
    );
  });

  it('returns a public profile with its counts', async () => {
    prisma.user.findUnique.mockResolvedValue(row);

    await expect(service.findOne('user-1')).resolves.toEqual({
      id: 'user-1',
      displayName: 'Ada',
      bio: 'Home cook.',
      photo: {
        small: '/api/v1/images/img-1/small',
        large: '/api/v1/images/img-1/large',
        width: 512,
        height: 512,
      },
      createdAt: row.createdAt,
      recipeCount: 2,
      followerCount: 3,
      followingCount: 1,
      followedByMe: false,
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: profileSelectFor(undefined),
    });
  });

  it('tells a signed-in viewer whether they follow the user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...row,
      followers: [{ id: 'follow-1' }],
    });

    const profile = await service.findOne('user-1', 'viewer-1');

    expect(profile.followedByMe).toBe(true);
    expect(profile).not.toHaveProperty('followers');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: profileSelectFor('viewer-1'),
    });
  });

  it('reports an unknown user as not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('updateOwn', () => {
    beforeEach(() => prisma.user.update.mockResolvedValue(row));

    it('updates only the signed-in user', async () => {
      await service.updateOwn('user-1', { displayName: 'Ada L.' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { displayName: 'Ada L.', bio: undefined },
        select: profileSelectFor('user-1'),
      });
    });

    it.each([
      ['an empty bio', '', null],
      ['a null bio', null, null],
      ['a new bio', 'Noodles.', 'Noodles.'],
    ])('stores %s as %j', async (_label, bio, stored) => {
      await service.updateOwn('user-1', { bio });

      expect(prisma.user.update.mock.calls[0][0].data.bio).toBe(stored);
    });
  });
});
