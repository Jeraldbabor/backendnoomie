import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service.js';
import type { ImagesService } from '../images/images.service.js';
import { ProfilesService } from './profiles.service.js';
import { profileSelect } from './profiles.types.js';

const row = {
  id: 'user-1',
  displayName: 'Ada',
  bio: 'Home cook.',
  photo: { id: 'img-1', width: 512, height: 512 },
  createdAt: new Date('2026-01-01'),
  _count: { recipes: 2 },
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

  it('returns a public profile with the recipe count', async () => {
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
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: profileSelect,
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
        select: profileSelect,
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
