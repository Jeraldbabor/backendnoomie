import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';

/** Global, like PrismaModule: features inject StorageService without re-importing. */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
