import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import {
  OptionalSessionAuthGuard,
  SessionAuthGuard,
} from '../auth/session-auth.guard.js';
import { PhotoUpload, requirePhoto } from '../images/photo-upload.js';
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
    return this.profilesService.findOne(auth.user.id, auth.user.id);
  }

  @Patch('me')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  updateMine(@Body() dto: UpdateProfileDto, @CurrentAuth() auth: AuthContext) {
    return this.profilesService.updateOwn(auth.user.id, dto);
  }

  @Put('me/photo')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @PhotoUpload()
  setMyPhoto(
    @UploadedFile() photo: Express.Multer.File | undefined,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.profilesService.setOwnPhoto(auth.user.id, requirePhoto(photo));
  }

  @Delete('me/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  removeMyPhoto(@CurrentAuth() auth: AuthContext) {
    return this.profilesService.removeOwnPhoto(auth.user.id);
  }

  // Open to everyone; signed-in viewers also get followedByMe.
  @Get(':userId')
  @UseGuards(OptionalSessionAuthGuard)
  @ApiBearerAuth()
  findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentAuth() auth: AuthContext | undefined,
  ) {
    return this.profilesService.findOne(userId, auth?.user.id);
  }
}
