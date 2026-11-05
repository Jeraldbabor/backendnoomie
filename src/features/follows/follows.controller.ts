import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CursorPaginationQueryDto } from '../../common/dto/cursor-pagination-query.dto.js';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import {
  OptionalSessionAuthGuard,
  SessionAuthGuard,
} from '../auth/session-auth.guard.js';
import { FollowsService } from './follows.service.js';

// Under /profiles/:userId, next to the profile itself. Following and unfollowing act for the
// signed-in user only; the lists are public, and signed-in viewers also get followedByMe.
@ApiTags('follows')
@Controller('profiles/:userId')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Put('follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  follow(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.followsService.follow(auth.user.id, userId);
  }

  @Delete('follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  unfollow(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.followsService.unfollow(auth.user.id, userId);
  }

  @Get('followers')
  @UseGuards(OptionalSessionAuthGuard)
  @ApiBearerAuth()
  followers(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: CursorPaginationQueryDto,
    @CurrentAuth() auth: AuthContext | undefined,
  ) {
    return this.followsService.followers(userId, query, auth?.user.id);
  }

  @Get('following')
  @UseGuards(OptionalSessionAuthGuard)
  @ApiBearerAuth()
  following(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: CursorPaginationQueryDto,
    @CurrentAuth() auth: AuthContext | undefined,
  ) {
    return this.followsService.following(userId, query, auth?.user.id);
  }
}
