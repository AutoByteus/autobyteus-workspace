import { describe, expect, it } from "vitest";
import { IN_PROCESS_SERVER_HOOK_TIMEOUT_MS } from "../../helpers/os-latency-under-load.js";
import "../../e2e/helpers/studio-runtime-test-server.js";

/**
 * autobyteus-561 AC-007: a file that imports the in-process server helper registers its hooks with the long hook timeout, so a slow
 * teardown on a busy machine is not a failure of the suite. The effective value is read from the runner's config (the worker's
 * config is what `vi.setConfig` changes and what hooks registered afterwards use); waiting 11 s for a real slow hook would only
 * prove the same number. `in-process-server-hook-timeout-default.test.ts` is the file that does not import the helper.
 */
describe("a file that imports the in-process server helper", () => {
  it("has the 60 s hook timeout for the hooks it registers", () => {
    const config = (globalThis as unknown as { __vitest_worker__?: { config?: { hookTimeout?: number } } }).__vitest_worker__?.config;
    expect(IN_PROCESS_SERVER_HOOK_TIMEOUT_MS).toBe(60_000);
    expect(config?.hookTimeout).toBe(IN_PROCESS_SERVER_HOOK_TIMEOUT_MS);
  });
});
