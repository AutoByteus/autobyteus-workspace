// While Memory Sync waits for its autobyteus-290 data migration, the settings GraphQL answers like any GraphQL error
// (HTTP 200 with the reason in `errors`), so the Memory Sync card shows "Memory Sync is waiting for its data
// migration." instead of a failed request (autobyteus-437 CR-005). The real studio server, in this process.
// Run (clean environment, TESTING.md):
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory-sync/memory-sync-held-back-graphql.e2e.test.ts --no-watch
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { configureMemorySyncCapability, MEMORY_SYNC_NOT_MIGRATED_TEXT } from "../../../src/memory-sync/shared/memory-sync-capability.js";
import { startStudioE2eRuntimeServer, type StartedStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

describe("Memory Sync settings while held back", () => {
  let dataDir: string;
  let started: StartedStudioE2eRuntimeServer;

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-sync-held-back-"));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    started = await startStudioE2eRuntimeServer("127.0.0.1");
    configureMemorySyncCapability(false);
  }, 60_000);

  afterAll(async () => {
    configureMemorySyncCapability(true);
    await started?.fastify.close();
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("answers the settings query with HTTP 200 and the reason, not a 503", async () => {
    const response = await fetch(new URL("/graphql", started.mainUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ getMemorySyncStatus { hub { enabled } } }" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json() as { errors?: Array<{ message: string }> };
    expect(body.errors?.map((error) => error.message)).toEqual([MEMORY_SYNC_NOT_MIGRATED_TEXT]);
  });
});
