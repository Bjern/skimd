import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/markdown/**/*.ts'],
      thresholds: { lines: 100, functions: 100, branches: 95, statements: 100 },
    },
  },
});
