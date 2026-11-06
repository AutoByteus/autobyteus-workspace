import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { flushMicrotasks } from "../agent-org-execution/helpers/task-publication-handles.js";
import { HOST, buildManager, cleanupDirectories } from "./helpers/standalone-root-harness.js";

/**
 * FU-008 of autobyteus-348 (stopped-run-edit-root-check): a stopped standalone run whose root is still registered (the host
 * went down by itself) can be edited in Settings. The root hands the host's launch to the delegated copies it starts, so it must
 * follow the saved edit: a copy started afterwards carries the saved model, settings and runtime, not the ones the root captured
 * when it loaded. The saved edit is simulated by what it writes: the host's metadata (`setMetadata`), then the product call.
 */
afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

type Fixture = Awaited<ReturnType<typeof buildManager>>;
const delegate = async (f: Fixture, root: Awaited<ReturnType<Fixture["manager"]["resolveRoot"]>>) => {
  await (root as never as { delegateToNewCopy(c: unknown, i: unknown): Promise<unknown> })
    .delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", description: "Review" });
  await flushMicrotasks();
  const tasks = root!.getExecutionTreeSnapshot().taskExecutions as unknown as Array<{ source: { launchConfiguration: Record<string, unknown> } }>;
  return tasks.at(-1)!.source.launchConfiguration;
};
/** The root wakes its crashed host itself, as a delegated copy's report does (no manager call), then the host delegates. */
const wakeThenDelegate = async (f: Fixture, root: Awaited<ReturnType<Fixture["manager"]["resolveRoot"]>>) => {
  await root!.ensureHostReady();
  return delegate(f, root);
};
const SAVED = { llmModelIdentifier: "gpt-saved", llmConfig: { effort: "low" } };

describe("a registered root follows the saved edit of its stopped host", () => {
  it("REPRODUCTION (AC-001): without the refresh a copy started after the edit inherits the OLD model", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    f.host.crash();
    f.setMetadata(SAVED);
    expect(await wakeThenDelegate(f, root)).toMatchObject({ llmModelIdentifier: "gpt-host", llmConfig: { effort: "high" } });
  });

  it("AC-001: after the refresh a copy carries the saved model and settings; a model-only edit and an undo give the same result", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    f.host.crash();
    f.setMetadata(SAVED);
    await f.manager.refreshInheritedLaunch(HOST);
    expect(await wakeThenDelegate(f, root)).toMatchObject({ llmModelIdentifier: "gpt-saved", llmConfig: { effort: "low" }, runtimeKind: RuntimeKind.CODEX_APP_SERVER });
    f.host.crash();
    f.setMetadata({ llmModelIdentifier: "gpt-host", llmConfig: { effort: "high" } });
    await f.manager.refreshInheritedLaunch(HOST);
    expect(await wakeThenDelegate(f, root)).toMatchObject({ llmModelIdentifier: "gpt-host", llmConfig: { effort: "high" } });
  });

  it("AC-002: a runtime change (a pending switch) reaches the copy; the host's marker is not written by the refresh", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    f.host.crash();
    f.setMetadata({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "claude-sonnet", llmConfig: null, platformAgentRunId: null,
      pendingRuntimeSwitch: { switchId: "s1", from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-host", llmConfig: null, platformAgentRunId: "thread-1" } } });
    await f.manager.refreshInheritedLaunch(HOST);
    expect(f.restores).not.toHaveBeenCalled();
    expect(await wakeThenDelegate(f, root)).toMatchObject({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "claude-sonnet" });
    expect(f.host.published).toEqual([]);
  });

  it("AC-003: an edit while the root is still loading is read once the root has loaded", async () => {
    const f = await buildManager();
    const loading = f.manager.resolveRoot(HOST); // reads the old metadata, then loads
    await Promise.resolve();
    expect(f.manager.hasRoot(HOST)).toBe(true);
    f.setMetadata(SAVED);
    const refreshing = f.manager.refreshInheritedLaunch(HOST);
    const root = (await loading)!;
    await refreshing;
    expect(await delegate(f, root)).toMatchObject({ llmModelIdentifier: "gpt-saved" });
  });

  it("AC-005: with no registered root nothing is read or created, and a root loaded later carries the saved launch", async () => {
    const f = await buildManager();
    await expect(f.manager.refreshInheritedLaunch(HOST)).resolves.toBeUndefined();
    expect(f.manager.hasRoot(HOST)).toBe(false);
    f.setMetadata(SAVED);
    const root = (await f.manager.resolveRoot(HOST))!;
    expect(await delegate(f, root)).toMatchObject({ llmModelIdentifier: "gpt-saved" });
  });

  it("a run that is not eligible, or has no metadata, is left alone", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    f.setMetadata({ applicationExecutionContext: { applicationId: "app", bindingId: "b", producer: { agentRunId: HOST, displayName: "x" } } as never, ...SAVED });
    await expect(f.manager.refreshInheritedLaunch(HOST)).resolves.toBeUndefined();
    f.setMetadata({});
    expect(await delegate(f, root)).toMatchObject({ llmModelIdentifier: "gpt-host" });
  });

  it("the next use of the root heals a missed refresh: resolving it for the host reads the current launch", async () => {
    const f = await buildManager();
    const root = (await f.manager.resolveRoot(HOST))!;
    f.host.crash();
    f.setMetadata(SAVED);
    await f.manager.resolveRootAndEnsureHost(HOST);
    expect(await delegate(f, root)).toMatchObject({ llmModelIdentifier: "gpt-saved" });
  });
});
