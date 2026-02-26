import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Setup file to run before tests (like conftest.py)
    setupFiles: ['./tests/setup.ts'],
    // Environment defaults to node
    environment: 'node',
    // Increase timeout for integration tests might be needed later
    testTimeout: 20000, 
  },
});
