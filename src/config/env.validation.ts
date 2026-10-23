import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  /** How long a sign-in lasts before the user must sign in again. */
  @IsInt()
  @Min(1)
  @Max(365)
  SESSION_TTL_DAYS: number = 30;

  /** Comma-separated list of browser origins allowed by CORS. Empty disables CORS. */
  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  /**
   * S3-compatible storage for uploaded images. Leave empty for AWS S3; set it for anything
   * else (local SeaweedFS, Cloudflare R2), which then uses path-style URLs.
   */
  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  STORAGE_ENDPOINT?: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_REGION: string = 'us-east-1';

  @IsString()
  @IsNotEmpty()
  STORAGE_BUCKET: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_ACCESS_KEY: string;

  @IsString()
  @IsNotEmpty()
  STORAGE_SECRET_KEY: string;
}

/** Fails fast at startup when required environment variables are missing or invalid. */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return env;
}
