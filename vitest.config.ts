import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/markdown/**/*.ts'],
      // 100% target on lines/functions/statements (pure pipeline, easy to test).
      // Branches relaxed to 75 — many are defensive `?? ''` defaults whose alternatives
      // never trigger under marked's actual output. Not worth gymnastics to hit 95.
      thresholds: { lines: 100, functions: 100, branches: 75, statements: 100 },
    },
  },
});
