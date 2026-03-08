import path from "node:path";
import { defineConfig } from "vitest/config";

const webRoot = "/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-move-stale-children/autobyteus-web";

export default defineConfig({
  resolve: {
    alias: {
      "~": webRoot,
      "@": webRoot,
    },
  },
  test: {
    environment: "node",
    pool: "forks",
    fileParallelism: false,
    include: [
      path.join(webRoot, "utils/fileExplorer/__tests__/fileUtils.test.ts"),
      path.join(webRoot, "utils/fileExplorer/__tests__/stateSync.test.ts"),
    ],
  },
});
