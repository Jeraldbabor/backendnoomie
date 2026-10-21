import {
  ArgumentsHost,
  Catch,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../../generated/prisma/client.js';

/**
 * Maps known Prisma errors to HTTP errors so raw database details never reach clients.
 * Unmapped codes fall through to Nest's default handler: logged, generic 500 response.
 * Error codes: https://pris.ly/d/prisma-error-codes
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    switch (exception.code) {
      case 'P2002':
        return super.catch(
          new ConflictException('A record with these values already exists'),
          host,
        );
      case 'P2003':
        return super.catch(
          new ConflictException('A related record is missing or still in use'),
          host,
        );
      case 'P2025':
        return super.catch(new NotFoundException('Record not found'), host);
      default:
        return super.catch(exception, host);
    }
  }
}
