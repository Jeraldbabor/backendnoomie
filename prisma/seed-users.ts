import { PasswordService } from '../src/features/auth/password.service.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Public, local-only fixtures, never credentials for a deployed environment.
export const TEST_USER_PASSWORD = 'NoomieTest123!';
export const TEST_USERS = [
  {
    email: 'tester@example.test',
    displayName: 'Noomie Tester',
    bio: 'Testing recipes and discovering new favourites.',
  },
  {
    email: 'alice@example.test',
    displayName: 'Alice Santos',
    bio: 'Home cook who loves quick weekday meals.',
  },
  {
    email: 'bob@example.test',
    displayName: 'Bob Reyes',
    bio: 'Weekend cook exploring new flavours.',
  },
] as const;

/** Adds missing accounts only; existing passwords, profiles and sessions are untouched. */
export async function seedUsers(
  prisma: PrismaClient,
  nodeEnv = process.env['NODE_ENV'] ?? 'development',
) {
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    throw new Error('Test users can only be seeded in development or test');
  }
  const passwords = new PasswordService();
  const data = [];
  for (const user of TEST_USERS) {
    data.push({
      ...user,
      passwordHash: await passwords.hash(TEST_USER_PASSWORD),
    });
  }
  // One atomic insert; the unique email constraint also makes concurrent runs safe.
  const { count } = await prisma.user.createMany({
    data,
    skipDuplicates: true,
  });
  return { added: count, skipped: TEST_USERS.length - count };
}
