import {
  applyDecorators,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * For routes that take one photo as the multipart field `photo` (up to 10 MB; more is 413).
 * The file is kept in memory, then processed and stored by ImagesService. Uploads are
 * limited to 20 per minute per client.
 */
export const PhotoUpload = () =>
  applyDecorators(
    Throttle({ default: { limit: 20, ttl: 60_000 } }),
    UseInterceptors(
      FileInterceptor('photo', {
        limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0 },
      }),
    ),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['photo'],
        properties: { photo: { type: 'string', format: 'binary' } },
      },
    }),
  );

/** The uploaded file's bytes, or 400 when the request had no `photo` file. */
export function requirePhoto(file: Express.Multer.File | undefined): Buffer {
  if (!file || file.size === 0) {
    throw new BadRequestException(
      'Send the image as a multipart/form-data field named "photo"',
    );
  }
  return file.buffer;
}
