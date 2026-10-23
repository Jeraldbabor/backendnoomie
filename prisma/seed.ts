// Development seed data, mirroring the Noomie app's local preview recipes.
// Run with `npm run db:seed`. Safe to run again: it adds missing sample recipes and refreshes
// existing ones (matched by title) to the content below. User recipes are never touched.
// These are Noomie editorial recipes: no author, so no user can edit them through the API.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

type SeedIngredient = {
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
};

const recipes = [
  {
    title: 'Lemon & herb chickpea bowl',
    cuisine: 'Mediterranean',
    minutes: 20,
    servings: 2,
    description:
      'Chickpeas, crisp cucumber and a bright lemon dressing. A little freshness for your everyday table.',
    ingredients: [
      {
        name: 'chickpeas',
        quantity: 400,
        unit: 'g',
        note: 'drained and rinsed',
      },
      { name: 'cucumber', quantity: 1, note: 'diced' },
      { name: 'lemon', quantity: 1, note: 'juiced' },
      { name: 'parsley', quantity: 1, unit: 'bunch', note: 'chopped' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'salt', note: 'to taste' },
    ] satisfies SeedIngredient[],
    steps: [
      'Drain and rinse the chickpeas, then pat them dry.',
      'Dice the cucumber and finely chop the parsley.',
      'Whisk the lemon juice with the olive oil and a pinch of salt.',
      'Toss everything together and taste for salt and lemon before serving.',
    ],
  },
  {
    title: 'Miso mushroom rice',
    cuisine: 'Japanese-inspired',
    minutes: 30,
    servings: 2,
    description:
      'Golden mushrooms, warm rice and a spoonful of mellow miso. Comfort in the simplest ingredients.',
    ingredients: [
      { name: 'rice', quantity: 200, unit: 'g', note: 'short-grain' },
      { name: 'mushrooms', quantity: 250, unit: 'g', note: 'sliced' },
      { name: 'miso', quantity: 1, unit: 'tbsp', note: 'white' },
      { name: 'butter', quantity: 1, unit: 'tbsp' },
      { name: 'spring onion', quantity: 2, note: 'thinly sliced' },
    ] satisfies SeedIngredient[],
    steps: [
      'Rinse the rice until the water runs clear, then cook it according to the packet.',
      'Melt the butter in a wide pan and fry the mushrooms over high heat until golden, about 8 minutes.',
      'Stir the miso with 2 tablespoons of hot water until smooth, then toss it through the mushrooms.',
      'Spoon the mushrooms over the rice and scatter with spring onion.',
    ],
  },
  {
    title: 'Slow Sunday tomato pasta',
    cuisine: 'Italian-inspired',
    minutes: 35,
    servings: 4,
    description:
      'Tomatoes, basil and your favourite pasta. An unhurried idea for a table worth gathering around.',
    ingredients: [
      { name: 'pasta', quantity: 400, unit: 'g' },
      { name: 'tomatoes', quantity: 800, unit: 'g', note: 'ripe, chopped' },
      { name: 'olive oil', quantity: 3, unit: 'tbsp' },
      { name: 'garlic', quantity: 2, unit: 'clove', note: 'sliced' },
      { name: 'basil', quantity: 1, unit: 'handful', note: 'leaves torn' },
      { name: 'salt', note: 'to taste' },
    ] satisfies SeedIngredient[],
    steps: [
      'Warm the olive oil in a large pan over low heat and cook the garlic gently for 2 minutes without browning.',
      'Add the tomatoes and a pinch of salt, then simmer slowly for 25 minutes, stirring now and then.',
      'Meanwhile, cook the pasta in well-salted water until just tender. Keep a cup of the cooking water.',
      'Toss the pasta with the sauce, loosening it with a little cooking water, and finish with torn basil.',
    ],
  },
];

try {
  let added = 0;
  let refreshed = 0;
  for (const { ingredients, ...recipe } of recipes) {
    const rows = ingredients.map((ingredient: SeedIngredient, position) => ({
      position,
      name: ingredient.name,
      quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null,
      note: ingredient.note ?? null,
    }));
    const existing = await prisma.recipe.findFirst({
      where: { title: recipe.title, authorId: null },
      select: { id: true },
    });
    if (existing) {
      await prisma.recipe.update({
        where: { id: existing.id },
        data: {
          ...recipe,
          ingredients: { deleteMany: {}, createMany: { data: rows } },
        },
      });
      refreshed++;
    } else {
      await prisma.recipe.create({
        data: { ...recipe, ingredients: { createMany: { data: rows } } },
      });
      added++;
    }
  }
  console.log(`Sample recipes: ${added} added, ${refreshed} refreshed.`);
} finally {
  await prisma.$disconnect();
}
