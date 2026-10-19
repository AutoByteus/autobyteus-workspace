import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

const sourceRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), 'src');

export default defineConfig({
  resolve: {
    // Server code loaded by live test setup imports `autobyteus-ts` by package
    // name; resolve it to this package's sources so tests share one copy of
    // every class (for example `MissingApiKeyError`) and need no dist build.
    alias: [
      { find: /^autobyteus-ts$/, replacement: path.join(sourceRoot, 'index.ts') },
      { find: /^autobyteus-ts\/(.*)\.js$/, replacement: `${sourceRoot}/$1.ts` },
    ],
  },
  test: {
    // Setup file to run before tests (like conftest.py)
    setupFiles: ['./tests/setup.ts'],
    // Environment defaults to node
    environment: 'node',
    // Increase timeout for integration tests might be needed later
    testTimeout: 20000,
    exclude: [
      ...configDefaults.exclude,
      'tickets/**',
      'tmp-*/**'
    ],
  },
});
