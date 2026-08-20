import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const serverRoot = "/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-conversation-ui-design/autobyteus-server-ts";

export default defineConfig({
  root: serverRoot,
  plugins: [tsconfigPaths({ projects: [`${serverRoot}/tsconfig.json`] })],
  server: {
    deps: {
      inline: ["repository_prisma", "@prisma/client"],
    },
  },
  test: {
    pool: "forks",
    fileParallelism: false,
    environment: "node",
    setupFiles: [`${serverRoot}/tests/setup/prisma-env.ts`],
    globalSetup: `${serverRoot}/tests/setup/prisma-global-setup.ts`,
  },
});
