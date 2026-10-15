import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    // The production metrics backend is compiled in: no test run may report to it or write
    // ~/.lara. The metrics tests clear this themselves before importing the module.
    env: { DO_NOT_TRACK: '1' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
    },
  },
  resolve: {
    alias: {
      '#env': new URL('./src/env.ts', import.meta.url).pathname,
      '#exception': new URL('./src/exception.ts', import.meta.url).pathname,
      '#logger': new URL('./src/logger.ts', import.meta.url).pathname,
      '#rest/server': new URL('./src/rest/server.ts', import.meta.url).pathname,
      '#mcp/server': new URL('./src/mcp/server.ts', import.meta.url).pathname
    }
  }
}); 