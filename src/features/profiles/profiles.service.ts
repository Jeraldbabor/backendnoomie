import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ImagesService } from '../images/images.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import {
  profileSelectFor,
  ProfileView,
  toProfileView,
} from './profiles.types.js';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImagesService,
  ) {}

  /** `viewerId` is the signed-in user, if any; it only decides `followedByMe`. */
  async findOne(userId: string, viewerId?: string): Promise<ProfileView> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelectFor(viewerId),
    });
    if (!row) {
      throw new NotFoundException('Profile not found');
    }
    return toProfileView(row);
  }

  /** Only ever changes the signed-in user's own profile; no route takes another user's id. */
  async updateOwn(userId: string, dto: UpdateProfileDto): Promise<ProfileView> {
    const { displayName, bio } = dto;
    const row = await this.prisma.user.update({
      where: { id: userId },
      // An empty bio clears it, stored as null like a bio that was never written.
      data: { displayName, bio: bio === undefined ? undefined : bio || null },
      select: profileSelectFor(userId),
    });
    return toProfileView(row);
  }

  /** Sets or replaces the signed-in user's photo; the previous one is deleted. */
  async setOwnPhoto(userId: string, data: Buffer): Promise<ProfileView> {
    const image = await this.images.create(userId, 'profile', data);
    let previous: string | null;
    try {
      previous = await this.swapPhoto(userId, image.id);
    } catch (error) {
      await this.images.delete([image.id]);
      throw error;
    }
    await this.images.delete([previous]);
    return this.findOne(userId);
  }

  /** Removes the signed-in user's photo. Safe to repeat. */
  async removeOwnPhoto(userId: string): Promise<void> {
    await this.images.delete([await this.swapPhoto(userId, null)]);
  }

  /** Like RecipesService.swapPhoto: locks the user row, sets the photo, returns the old one. */
  private swapPhoto(
    userId: string,
    photoId: string | null,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ photo_id: string | null }[]>`
        SELECT photo_id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      if (!row) {
        throw new NotFoundException('Profile not found');
      }
      await tx.user.update({ where: { id: userId }, data: { photoId } });
      return row.photo_id;
    });
  }
}
