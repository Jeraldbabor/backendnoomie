// Development seed data, mirroring the Noomie app's local preview recipes.
// Run with `npm run db:seed`. Skips seeding when recipes already exist.
// These are Noomie editorial recipes: no author, so no user can edit them through the API.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

const recipes = [
  {
    title: 'Lemon & herb chickpea bowl',
    cuisine: 'Mediterranean',
    minutes: 20,
    description:
      'Chickpeas, crisp cucumber and a bright lemon dressing. A little freshness for your everyday table.',
    ingredients: ['chickpeas', 'cucumber', 'lemon', 'parsley'],
  },
  {
    title: 'Miso mushroom rice',
    cuisine: 'Japanese-inspired',
    minutes: 30,
    description:
      'Golden mushrooms, warm rice and a spoonful of mellow miso. Comfort in the simplest ingredients.',
    ingredients: ['mushrooms', 'rice', 'miso', 'spring onion'],
  },
  {
    title: 'Slow Sunday tomato pasta',
    cuisine: 'Italian-inspired',
    minutes: 35,
    description:
      'Tomatoes, basil and your favourite pasta. An unhurried idea for a table worth gathering around.',
    ingredients: ['tomatoes', 'basil', 'pasta', 'olive oil'],
  },
];

try {
  if ((await prisma.recipe.count()) > 0) {
    console.log('Recipes already present, skipping seed.');
  } else {
    const { count } = await prisma.recipe.createMany({ data: recipes });
    console.log(`Seeded ${count} recipes.`);
  }
} finally {
  await prisma.$disconnect();
}
