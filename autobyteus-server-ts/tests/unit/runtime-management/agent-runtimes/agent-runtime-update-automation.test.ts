import { describe, expect, it, vi } from "vitest";
import { AgentRuntimeError } from "../../../../src/runtime-management/agent-runtimes/agent-runtime-status-service.js";
import { runtimeUpdateSource } from "../../../../src/update-notifications/services/runtime-update-source.js";
import { AGY, build, CLAUDE, CODEX, deferred, GROK, settle } from "./agent-runtime-status-fixtures.js";

const checkedAll = async (h: ReturnType<typeof build>) => { await h.service.checkAll(); await settle(); };

describe("AgentRuntimeStatusService background check (DS-001, REQ-021)", () => {
  it("reads installed and newest versions only, never the sign-in, and announces when done", async () => {
    const h = build({ strategies: { [CODEX]: { readLatestVersion: vi.fn(async () => "1.2.0") } } });
    const listener = vi.fn();
    h.service.setUpdateStateListener(listener);
    await h.service.checkInBackground(CODEX);
    expect(h.read).not.toHaveBeenCalled();
    expect(h.row(CODEX)).toMatchObject({ installed: true, installedVersion: "1.0.0", latestVersion: "1.2.0", updateState: "updateAvailable" });
    expect(h.row(CODEX).checkedAt).toBeInstanceOf(Date);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("keeps a finished update result and the account state the page showed", async () => {
    const h = build({ readings: { [CODEX]: { state: "signedOut" } } });
    await checkedAll(h);
    h.service.startUpdate(CODEX);
    vi.mocked(h.strategies[0]!.readVersion).mockResolvedValue("1.1.0");
    h.processes[0]!.exit(0);
    await settle();
    await settle();
    const operation = h.row(CODEX).operation;
    expect(operation).toMatchObject({ kind: "update", state: "succeeded" });
    await h.service.checkInBackground(CODEX);
    expect(h.row(CODEX).operation).toEqual(operation);
    expect(h.row(CODEX).accountState).toBe("signedOut");
  });

  it("is skipped while the runtime is checking or has a running operation", async () => {
    const version = deferred<string | null>();
    const h = build({ strategies: { [CLAUDE]: { readVersion: vi.fn(() => version.promise) } } });
    const first = h.service.checkInBackground(CLAUDE);
    await h.service.checkInBackground(CLAUDE);
    expect(h.strategies[1]!.readVersion).toHaveBeenCalledOnce();
    version.resolve("1.0.0");
    await first;

    await checkedAll(h);
    h.service.startUpdate(GROK);
    const calls = vi.mocked(h.strategies[3]!.readVersion).mock.calls.length;
    await h.service.checkInBackground(GROK);
    expect(h.strategies[3]!.readVersion).toHaveBeenCalledTimes(calls);
  });

  it("records a failed newest-version read as checkFailed, and not installed as not checked", async () => {
    const h = build({ strategies: {
      [CODEX]: { readLatestVersion: vi.fn(async () => { throw new Error("offline"); }) },
      [AGY]: { readVersion: vi.fn(async () => null) },
    } });
    await h.service.checkInBackground(CODEX);
    await h.service.checkInBackground(AGY);
    expect(h.row(CODEX).updateState).toBe("checkFailed");
    expect(h.row(AGY)).toMatchObject({ installed: false, updateState: "notChecked" });
  });
});

describe("AgentRuntimeStatusService runUpdate (REQ-022)", () => {
  it("returns the refusals as results, without starting a process", async () => {
    const h = build({ agents: { [CODEX]: 2 }, strategies: { [AGY]: { readVersion: vi.fn(async () => null) } } });
    await checkedAll(h);
    expect(await h.service.runUpdate(CODEX)).toEqual({ result: "refused", reason: "AGENTS_RUNNING", runningAgents: 2 });
    expect(await h.service.runUpdate(AGY)).toEqual({ result: "refused", reason: "NOT_INSTALLED", runningAgents: 0 });
    h.service.startUpdate(CLAUDE);
    expect(await h.service.runUpdate(CLAUDE)).toEqual({ result: "refused", reason: "BUSY", runningAgents: 0 });
    expect(h.processes).toHaveLength(1);
  });

  it("settles with the vendor update's result: updated with the versions, or failed with the vendor output", async () => {
    const h = build();
    await checkedAll(h);
    const listener = vi.fn();
    h.service.setUpdateStateListener(listener);
    const updated = h.service.runUpdate(CODEX);
    expect(h.row(CODEX).operation).toMatchObject({ kind: "update", state: "running" });
    vi.mocked(h.strategies[0]!.readVersion).mockResolvedValue("1.3.0");
    h.processes[0]!.exit(0);
    expect(await updated).toEqual({ result: "updated", fromVersion: "1.0.0", toVersion: "1.3.0" });
    expect(listener).toHaveBeenCalled();

    const failed = h.service.runUpdate(CLAUDE);
    h.processes[1]!.exit(1, "npm ERR! EACCES");
    expect(await failed).toEqual({ result: "failed", error: "npm ERR! EACCES" });
    expect(h.row(CLAUDE).operation).toMatchObject({ kind: "update", state: "failed", error: "npm ERR! EACCES" });
  });

  it("startUpdate still throws the existing refusal codes", async () => {
    const h = build({ agents: { [CODEX]: 1 } });
    await checkedAll(h);
    expect(() => h.service.startUpdate(CODEX)).toThrow(AgentRuntimeError);
    expect(() => h.service.startUpdate(CODEX)).toThrow("Update unavailable while 1 agent(s) are running.");
  });
});

describe("runtime update source for the notifications (AR-005)", () => {
  it("maps each runtime's facts: not checked keeps the record, not installed drops it, a failed check keeps the known latest unknown", async () => {
    const h = build({ strategies: {
      [CODEX]: { readLatestVersion: vi.fn(async () => "1.4.0") },
      [CLAUDE]: { readLatestVersion: vi.fn(async () => { throw new Error("offline"); }) },
      [AGY]: { readVersion: vi.fn(async () => null) },
    } });
    await h.service.checkInBackground(CODEX);
    await h.service.checkInBackground(CLAUDE);
    await h.service.checkInBackground(AGY);
    const states = await runtimeUpdateSource(h.service).listUpdateStates();
    expect(states.map((state) => [state.sourceId, state.installedRevision, state.latestRevision])).toEqual([
      [CODEX, "1.0.0", "1.4.0"],
      [CLAUDE, "1.0.0", null],
      [GROK, null, null],
    ]);
    expect(states[0]).toMatchObject({ displayName: CODEX, repositoryUrl: null, defaultBranch: null });
    expect(states[0]!.lastCheckedAt).toEqual(expect.any(String));
    expect(runtimeUpdateSource(h.service).kind).toBe("AGENT_RUNTIME");
  });
});
