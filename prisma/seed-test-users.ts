// Explicit opt-in development/test accounts. Run with `npm run db:seed:users`.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedUsers, TEST_USERS } from './seed-users.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

try {
  const { added, skipped } = await seedUsers(prisma);
  console.log(`Test users: ${added} added, ${skipped} skipped.`);
  console.log(TEST_USERS.map((user) => user.email).join('\n'));
  console.log(
    'Existing accounts are unchanged. See docs/setup/local-backend.md for the test password.',
  );
} finally {
  await prisma.$disconnect();
}
