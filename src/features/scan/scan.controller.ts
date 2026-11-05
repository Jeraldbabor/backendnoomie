import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthContext } from '../auth/auth.types.js';
import { CurrentAuth } from '../auth/current-auth.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { PhotoUpload, requirePhoto } from '../images/photo-upload.js';
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
}
