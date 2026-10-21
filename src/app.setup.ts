import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { EnvironmentVariables, NodeEnv } from './config/env.validation.js';

/**
 * HTTP-level setup shared by `main.ts` and the e2e tests, so tests exercise the
 * same prefix, versioning, and middleware as the running server.
 */
export function configureApp(app: INestApplication): void {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();

  const corsOrigins = (config.get('CORS_ORIGINS', { infer: true }) ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins });
  }

  // Registered before helmet so its Content-Security-Policy does not block the
  // Swagger UI's inline assets. Docs are never served in production.
  if (config.get('NODE_ENV', { infer: true }) !== NodeEnv.Production) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Noomie API')
        .setVersion('1')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  app.use(helmet());
}
