import { Module } from '@nestjs/common';
import { ImagesController } from './images.controller.js';
import { ImagesService } from './images.service.js';

/**
 * Uploaded images: serving their files, and ImagesService for features that attach images
 * to their records. Response shapes are in images.types.ts.
 */
@Module({
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
