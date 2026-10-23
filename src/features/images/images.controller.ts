import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { IMAGE_SIZES, type ImageSize } from './image-processing.js';
import { ImagesService } from './images.service.js';

const SIZE_VALUES = Object.fromEntries(IMAGE_SIZES.map((size) => [size, size]));

// Public: every stored image is a recipe or profile photo, which anyone can see.
@ApiTags('images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  /**
   * An image file (WebP). Image ids are never reused and files never change, so clients may
   * cache them forever. Not rate-limited: a single screen can show many images.
   */
  @Get(':id/:size')
  @SkipThrottle()
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  // Helmet sends same-origin by default; images may be shown on other origins (the web app).
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('size', new ParseEnumPipe(SIZE_VALUES)) size: ImageSize,
  ): Promise<StreamableFile> {
    const file = await this.imagesService.open(id, size);
    if (!file) {
      throw new NotFoundException('Image not found');
    }
    return new StreamableFile(file.body, {
      type: file.contentType ?? 'image/webp',
      length: file.contentLength,
    });
  }
}
