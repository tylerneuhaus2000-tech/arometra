import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@test': path.resolve(import.meta.dirname, 'test'),
    },
  },
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.ts', 'test/unit/**/*.test.tsx', 'test/db/**/*.test.ts'],
    testTimeout: 20_000,
  },
});
