import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
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
