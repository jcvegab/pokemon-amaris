/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      globals: true,
      css: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.spec.{ts,tsx}',
          'src/main.tsx',
          'src/app/**',
          'src/test-setup.ts',
          'src/**/*.d.ts',
          'src/Contexts/Pokemon/ui/theme/**',
        ],
        thresholds: {
          lines: 85,
          statements: 85,
          functions: 85,
          branches: 80,
        },
      },
    },
  }),
);
