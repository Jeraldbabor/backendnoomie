import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ProfilesService } from './profiles.service.js';

// Anyone can view a profile; users can only edit their own, through /profiles/me.
@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // The "me" routes come before ":userId" so "me" isn't read as a user id.
  @Get('me')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  findMine(@CurrentAuth() auth: AuthContext) {
    return this.profilesService.findOne(auth.user.id);
  }

  @Patch('me')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  updateMine(@Body() dto: UpdateProfileDto, @CurrentAuth() auth: AuthContext) {
    return this.profilesService.updateOwn(auth.user.id, dto);
  }

  @Get(':userId')
  findOne(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.profilesService.findOne(userId);
  }
}
