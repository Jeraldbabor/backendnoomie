import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // The first photo in a test app loads the food-scan model. That takes about 3 seconds
    // alone, and more while the other test files run in parallel.
    testTimeout: 20_000,
  },
});
