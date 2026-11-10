import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { PhotoUpload, requirePhoto } from '../images/photo-upload.js';
import { ConfirmScanDto } from './dto/confirm-scan.dto.js';
import { ScanService } from './scan.service.js';

// Signed in, so uploads and model time have a known owner. The guard runs before the upload
// is read.
@ApiTags('scan')
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  /** Recipes whose photos look like this photo. The photo itself isn't stored. */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @PhotoUpload()
  scan(
    @UploadedFile() photo: Express.Multer.File | undefined,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.scanService.scan(requirePhoto(photo), auth.user.id);
  }

  /** Says which recipe a recent scan showed, teaching the scan that dish. */
  @Post(':scanId/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  confirm(
    @Param('scanId', ParseUUIDPipe) scanId: string,
    @Body() dto: ConfirmScanDto,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.scanService.confirm(scanId, dto.recipeId, auth.user.id);
  }
}
