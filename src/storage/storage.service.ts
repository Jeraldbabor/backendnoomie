import {
  DeleteObjectsCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'node:stream';
import { EnvironmentVariables } from '../config/env.validation.js';

/** One stored file, streamed. */
export interface StoredObject {
  body: Readable;
  contentType: string | undefined;
  contentLength: number | undefined;
}

/**
 * Thin wrapper over the S3-compatible bucket in STORAGE_*. Keys are paths like
 * `images/<id>/large`; callers decide them.
 */
@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const endpoint = config.get('STORAGE_ENDPOINT', { infer: true });
    this.bucket = config.get('STORAGE_BUCKET', { infer: true });
    this.s3 = new S3Client({
      endpoint: endpoint || undefined,
      region: config.get('STORAGE_REGION', { infer: true }),
      // Custom endpoints (SeaweedFS locally, R2) are addressed as endpoint/bucket/key.
      forcePathStyle: Boolean(endpoint),
      credentials: {
        accessKeyId: config.get('STORAGE_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('STORAGE_SECRET_KEY', { infer: true }),
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /** The file at `key`, or null when there is none. */
  async get(key: string): Promise<StoredObject | null> {
    try {
      const object = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        body: object.Body as Readable,
        contentType: object.ContentType,
        contentLength: object.ContentLength,
      };
    } catch (error) {
      if (error instanceof NoSuchKey) {
        return null;
      }
      throw error;
    }
  }

  /** Deletes the files at `keys`. Keys with no file are ignored. */
  async deleteMany(keys: string[]): Promise<void> {
    // DeleteObjects takes at most 1,000 keys per request.
    for (let start = 0; start < keys.length; start += 1000) {
      const batch = keys.slice(start, start + 1000);
      const result = await this.s3.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      if (result.Errors?.length) {
        const [first] = result.Errors;
        throw new Error(
          `Could not delete ${result.Errors.length} file(s), first ${first.Key}: ${first.Code}`,
        );
      }
    }
  }

  onModuleDestroy(): void {
    this.s3.destroy();
  }
}
