import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const coreSourceEntry = fileURLToPath(
  new URL('./node_modules/@pedigree/core/src/index.ts', import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      '@pedigree/core': coreSourceEntry,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/index.ts'],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
