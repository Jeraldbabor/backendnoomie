// Prisma CLI configuration. Prisma 7 does not load `.env` on its own, hence dotenv.
// Docs: https://pris.ly/prisma-config
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
