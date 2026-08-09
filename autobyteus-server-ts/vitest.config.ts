import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  server: {
    deps: {
      // repository_prisma ships ESM that imports named Prisma exports from the
      // CommonJS @prisma/client package. Native Node handles that package, but
      // Vitest's external module path does not, so transform this dependency.
      inline: ["repository_prisma"],
    },
  },
  test: {
    pool: "forks",
    fileParallelism: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: [
      "tests/unit/prompt-engineering/**/*.test.ts",
      "tests/unit/agent-tools/prompt-engineering/**/*.test.ts",
      "tests/integration/prompt-engineering/**/*.test.ts",
    ],
    setupFiles: ["./tests/setup/prisma-env.ts"],
    globalSetup: "./tests/setup/prisma-global-setup.ts",
  },
});
