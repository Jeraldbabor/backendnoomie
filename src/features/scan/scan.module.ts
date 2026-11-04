import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PhotoFingerprintService } from './photo-fingerprint.service.js';
import { ScanController } from './scan.controller.js';
import { ScanService } from './scan.service.js';

@Module({
  // AuthModule provides SessionAuthGuard's AuthService. Recipe shapes come from
  // recipes.types.ts, the recipes feature's public response contract.
  imports: [AuthModule],
  controllers: [ScanController],
  providers: [ScanService, PhotoFingerprintService],
  // RecipesService adds recipe photos to the scan.
  exports: [ScanService],
})
export class ScanModule {}
