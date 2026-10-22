import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { profileSelect, ProfileView, toProfileView } from './profiles.types.js';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string): Promise<ProfileView> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
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
      select: profileSelect,
    });
    return toProfileView(row);
  }
}
