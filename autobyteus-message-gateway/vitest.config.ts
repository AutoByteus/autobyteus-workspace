import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    preserveSymlinks: true,
    alias: [
      {
        find: /^autobyteus-ts\/(.+)$/,
        replacement: resolve(rootDir, "../autobyteus-ts/dist/$1"),
      },
      {
        find: "autobyteus-ts",
        replacement: resolve(rootDir, "../autobyteus-ts/dist/index.js"),
      },
    ],
  },
  server: {
    fs: {
      allow: [rootDir, resolve(rootDir, "..")],
    },
  },
});
