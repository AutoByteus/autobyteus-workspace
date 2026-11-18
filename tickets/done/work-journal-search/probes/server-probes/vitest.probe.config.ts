import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: { pool: "forks", environment: "node", include: ["probes-wjs/**/*.probe.ts"], testTimeout: 7_200_000 },
});
