import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    pool: "forks",
    fileParallelism: false,
    include: [
      "/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-move-stale-children/tickets/done/file-explorer-move-stale-children/nested-folder-move-probe.test.ts",
    ],
  },
});
