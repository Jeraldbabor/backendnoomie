import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import {
  IMAGE_TOO_LARGE,
  processImage,
  UNSUPPORTED_IMAGE,
} from './image-processing.js';

/** A solid-color test image in `format`, optionally with camera metadata. */
const photo = (
  width: number,
  height: number,
  format: 'jpeg' | 'png' | 'gif' = 'jpeg',
  metadata?: { orientation?: number; gps?: boolean },
) => {
  let image = sharp({
    create: { width, height, channels: 3, background: '#e8a33d' },
  });
  if (metadata?.orientation) {
    image = image.withMetadata({ orientation: metadata.orientation });
  }
  if (metadata?.gps) {
    image = image.withExif({
      IFD0: { Make: 'Test camera' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '14/1 35/1 0/1' },
    });
  }
  return image.toFormat(format).toBuffer();
};

describe('processImage', () => {
  it('shrinks recipe photos to 1600 and 480 pixels, keeping their shape', async () => {
    const result = await processImage('recipe', await photo(3200, 2400));

    expect([result.width, result.height]).toEqual([1600, 1200]);
    const small = await sharp(result.files.small).metadata();
    expect([small.format, small.width, small.height]).toEqual([
      'webp',
      480,
      360,
    ]);
  });

  it('never enlarges a small recipe photo', async () => {
    const result = await processImage('recipe', await photo(300, 200, 'png'));

    expect([result.width, result.height]).toEqual([300, 200]);
  });

  it('crops profile photos to centered squares', async () => {
    const result = await processImage('profile', await photo(900, 600));

    expect([result.width, result.height]).toEqual([512, 512]);
    const small = await sharp(result.files.small).metadata();
    expect([small.width, small.height]).toEqual([128, 128]);
  });

  it('turns photos upright and drops their metadata, including location', async () => {
    const input = await photo(400, 200, 'jpeg', { orientation: 6, gps: true });
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const result = await processImage('recipe', input);

    // Orientation 6 means "rotate 90°": the stored photo is portrait.
    expect([result.width, result.height]).toEqual([200, 400]);
    const stored = await sharp(result.files.large).metadata();
    expect(stored.exif).toBeUndefined();
    expect(stored.orientation).toBeUndefined();
  });

  it.each([
    ['text', Buffer.from('not an image')],
    ['an empty file', Buffer.alloc(0)],
  ])('rejects %s', async (_label, input) => {
    await expect(processImage('recipe', input)).rejects.toThrow(
      new BadRequestException(UNSUPPORTED_IMAGE),
    );
  });

  it('rejects formats other than JPEG, PNG and WebP', async () => {
    await expect(
      processImage('recipe', await photo(10, 10, 'gif')),
    ).rejects.toThrow(UNSUPPORTED_IMAGE);
  });

  it('rejects truncated image data', async () => {
    const input = await photo(400, 400);
    await expect(
      processImage('recipe', input.subarray(0, input.length / 2)),
    ).rejects.toThrow(UNSUPPORTED_IMAGE);
  });

  it('rejects images over 40 megapixels before decoding them', async () => {
    const input = await photo(8000, 5001, 'png');
    await expect(processImage('recipe', input)).rejects.toThrow(
      IMAGE_TOO_LARGE,
    );
  });
});
