import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';
import { InferenceSession, Tensor } from 'onnxruntime-node';
import sharp from 'sharp';
import { EnvironmentVariables, NodeEnv } from '../../config/env.validation.js';
import { UNSUPPORTED_IMAGE } from '../images/image-processing.js';

/** Fetched by `npm run scan:model`, and built into the Docker image. */
const MODEL_FILE = 'models/clip-vit-base-patch32-q8.onnx';

// The model's expected input (its preprocessor_config.json).
const SIZE = 224;
const MEAN = [0.48145466, 0.4578275, 0.40821073];
const STD = [0.26862954, 0.26130258, 0.27577711];

export const SCAN_UNAVAILABLE = 'Food scan is not available right now';

/**
 * Decodes a photo into what the model reads: upright, centered square, 224 x 224, RGB values
 * scaled and normalized, one color plane after another.
 */
export async function toModelInput(photo: Buffer): Promise<Float32Array> {
  let pixels: Buffer;
  try {
    pixels = await sharp(photo)
      .rotate()
      .resize(SIZE, SIZE, { fit: 'cover', position: 'centre', kernel: 'cubic' })
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer();
  } catch {
    // Headers can look fine while the image data is broken or truncated.
    throw new BadRequestException(UNSUPPORTED_IMAGE);
  }
  const count = SIZE * SIZE;
  const input = new Float32Array(3 * count);
  for (let i = 0; i < count; i++) {
    for (let channel = 0; channel < 3; channel++) {
      input[channel * count + i] =
        (pixels[i * 3 + channel] / 255 - MEAN[channel]) / STD[channel];
    }
  }
  return input;
}

/**
 * Runs the CLIP image model, which turns a photo into a "fingerprint": 512 numbers that are
 * close together for photos that look alike. Runs on the CPU, in this process.
 */
@Injectable()
export class PhotoFingerprintService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(PhotoFingerprintService.name);
  private session?: Promise<InferenceSession>;

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /**
   * Loading freezes the server for about a second, so production does it at startup rather
   * than during someone's request. Elsewhere it waits for the first photo, which keeps
   * development restarts and the many test apps from paying for a model they don't use.
   */
  onApplicationBootstrap(): void {
    if (this.config.get('NODE_ENV', { infer: true }) === NodeEnv.Production) {
      this.load().catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    const session = await this.session?.catch(() => undefined);
    await session?.release();
  }

  /** The photo's fingerprint, unit length. 503 when the model file isn't there. */
  async fingerprint(photo: Buffer): Promise<number[]> {
    const input = await toModelInput(photo);
    const session = await this.load();
    const { image_embeds: output } = await session.run({
      pixel_values: new Tensor('float32', input, [1, 3, SIZE, SIZE]),
    });
    const values = Array.from(output.data as Float32Array);
    const length = Math.hypot(...values);
    return values.map((value) => value / length);
  }

  private load(): Promise<InferenceSession> {
    this.session ??= InferenceSession.create(resolve(MODEL_FILE)).catch(
      (error: unknown) => {
        // Not fatal: the rest of the API works, and a later scan tries again.
        this.session = undefined;
        this.logger.warn(
          `Food-scan model not loaded (run \`npm run scan:model\`): ${String(error)}`,
        );
        throw new ServiceUnavailableException(SCAN_UNAVAILABLE);
      },
    );
    return this.session;
  }
}
