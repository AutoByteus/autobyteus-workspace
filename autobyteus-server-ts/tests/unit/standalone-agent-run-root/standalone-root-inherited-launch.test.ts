import { afterEach, describe, expect, it, vi } from "vitest";
import { HOST, buildManager, cleanupDirectories } from "./helpers/standalone-root-harness.js";

/**
 * AC-001 (kept by autobyteus-461): a registered root follows the saved edit of its stopped run, so a run it delegates to
 * from then on inherits the saved launch (the catalog port's launch base, which `TaskDelegation` resolves against).
 */
afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

describe("a registered root follows the saved edit of its stopped run", () => {
  it("the launch base after the refresh is the saved one; before it, the one the root was loaded with", async () => {
    const h = await buildManager();
    const root = (await h.manager.resolveRoot(HOST))!;
    const base = () => root.collaboratorPortFor(HOST).launchBase();
    expect(base()).toMatchObject({ kind: "inherited", launch: { llmModelIdentifier: "gpt-host" } });
    h.setMetadata({ llmModelIdentifier: "gpt-edited", llmConfig: { effort: "low" } });
    expect(base()).toMatchObject({ launch: { llmModelIdentifier: "gpt-host" } });
    await h.manager.refreshInheritedLaunch(HOST);
    expect(base()).toMatchObject({ kind: "inherited", launch: { llmModelIdentifier: "gpt-edited", llmConfig: { effort: "low" } } });
  });
});
