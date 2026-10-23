import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { validateEnv } from './config/env.validation.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './features/auth/auth.module.js';
import { DiscoverModule } from './features/discover/discover.module.js';
import { HealthModule } from './features/health/health.module.js';
import { ImagesModule } from './features/images/images.module.js';
import { ProfilesModule } from './features/profiles/profiles.module.js';
import { RecipesModule } from './features/recipes/recipes.module.js';
import { SavedRecipesModule } from './features/saved-recipes/saved-recipes.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Baseline rate limit per client IP and route; features can tighten it with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    StorageModule,
    // Feature modules
    AuthModule,
    DiscoverModule,
    HealthModule,
    ImagesModule,
    ProfilesModule,
    RecipesModule,
    SavedRecipesModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
