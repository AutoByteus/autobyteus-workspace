import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'

export default defineConfig({
  test: {
    // Set the environment to 'node' for all tests run with this config.
    // This is crucial for testing Electron main process code.
    environment: 'node',
    // Define the root for this test suite to ensure paths are resolved correctly.
    root: fileURLToPath(new URL('./', import.meta.url)),
    // Tell this runner to ONLY look for tests inside the /electron directory.
    include: ['**/*.{test,spec}.{js,ts}'],
  },
})
