import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";
import { RuntimeSwitchRecorder } from "../../../src/agent-memory/services/runtime-switch-recorder.js";
import { readPendingRuntimeHandover } from "../../../src/agent-memory/services/runtime-handover-reader.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { SavedRuntimeSessionMissingError } from "../../../src/agent-execution/errors.js";
import { buildSessionRenewal } from "../../../src/agent-execution/domain/runtime-switch.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { turnRecords } from "../../agent-work-journal/raw-trace-folder-fixtures.js";
import { OFFERED_STORED_MODEL_CHECKS } from "../../helpers/explicit-host-collaborators.js";

vi.mock("../../../src/run-history/services/root-run-package-readiness-index.js", () => ({
  RootRunPackageReadinessIndex: class { assertAdmitted = async () => undefined; },
}));

/**
 * The session renewal of a standalone run (autobyteus-599, DS-001; REQ-001…REQ-005, REQ-007; AC-001, AC-003, AC-004) with the
 * real switch recorder and real raw-trace files: the restore of the saved session fails with the runtime's own "not found",
 * and the same activation continues in a fresh session of the same runtime and model behind the lost-session marker.
 */
const RUN_ID = "run-1";
const HOST = { memberExecutionContext: { identity: { agentRunId: RUN_ID }, teamScoped: false } as never };
const LOST = "lost-session-1";
const FRESH = "fresh-session-2";
const RENEWAL = buildSessionRenewal({ runId: RUN_ID, side: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" },
  lostPlatformAgentRunId: LOST });

describe("a standalone run whose saved runtime session is lost", () => {
  let root: string;
  let runDir: string;
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "standalone-session-renewal-"));
    runDir = path.join(root, "agents", RUN_ID);
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(activePath(), turnRecords("t1", "git status", "clean").map((record) => JSON.stringify(record)).join("\n") + "\n");
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }); });

  const activePath = () => path.join(runDir, "raw_traces_active.jsonl");
  const manifestPath = () => path.join(runDir, "raw_traces_manifest.json");
  const lines = (file: string): Array<Record<string, any>> =>
    fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const metadata = (): AgentRunMetadata => ({
    runId: RUN_ID, agentDefinitionId: "agent-1", workspaceRootPath: "/w", memoryDir: runDir, llmModelIdentifier: "opus", llmConfig: null,
    autoExecuteTools: false, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, platformAgentRunId: LOST, startedAt: "2026-10-14T09:00:00.000Z",
  });
  const freshCandidate = () => ({
    runId: RUN_ID, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, platformAgentRunId: FRESH,
    commitPublication: vi.fn(() => ({ runId: RUN_ID })), abort: vi.fn(async () => ({ kind: "aborted" as const })),
  });
  const lostSession = () => async () => { throw new SavedRuntimeSessionMissingError(RuntimeKind.CLAUDE_AGENT_SDK, LOST); };

  /** A lifecycle whose manager runs one script entry per attempt of each kind; the real recorder is the memory port. */
  const lifecycle = (script: { restore: Array<() => Promise<unknown>>; fresh?: Array<() => Promise<unknown>> },
    options: { commit?: Array<"ok" | "fail">; switching?: boolean } = {}) => {
    let stored = metadata();
    const commits = options.commit ?? [];
    const newPreparation = vi.fn(async () => script.fresh!.shift()!());
    const manager = testActivationManager({
      getActiveRun: vi.fn(() => null),
      newPreparation,
      platformPreparation: vi.fn(async () => script.restore.shift()!()),
      restorePreparation: vi.fn(),
    });
    const service = new StandaloneAgentRunLifecycleService("/unused", { storedModelChecks: OFFERED_STORED_MODEL_CHECKS,
      agentRunManager: manager as never,
      metadataService: { readMetadataState: vi.fn(async () => ({ kind: "present" as const, metadata: stored })) } as never,
      historyCatalogService: { recordRunStarted: vi.fn(async (input: AgentRunMetadata & { clearPendingRuntimeSwitch?: boolean }) => {
        if (commits.shift() === "fail") throw new Error("metadata write failed");
        const { clearPendingRuntimeSwitch: _clear, ...written } = input;
        stored = written;
        return written;
      }) } as never,
      workspaceManager: { ensureWorkspaceByRootPath: vi.fn(async () => ({ workspaceId: "workspace-1" })) } as never,
      tokenUsageReadiness: { assertCurrentSchemaReady: () => undefined, assertExistingRunRestoreReady: () => undefined },
      modelSelectionValidator: { validate: vi.fn() } as never,
      switching: options.switching === false ? null : { memory: new RuntimeSwitchRecorder() },
    });
    return { service, manager, newPreparation, getStored: () => stored };
  };

  it("continues in a fresh session of the same runtime and model behind the lost-session marker (AC-001, REQ-007)", async () => {
    const previous = fs.readFileSync(activePath(), "utf8");
    const { service, manager, getStored } = lifecycle({ restore: [lostSession()], fresh: [async () => freshCandidate()] });

    const result = await service.activateRunAgent(RUN_ID, HOST);

    expect(result.metadata).toMatchObject({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", platformAgentRunId: FRESH });
    expect(getStored().platformAgentRunId).toBe(FRESH);
    expect(manager.beginActivation.mock.calls.map(([request]: any[]) => request.kind)).toEqual(["platform_restore", "new"]);
    // The previous records are kept, byte for byte, as a closed segment; the active file starts with the marker.
    expect(fs.readFileSync(path.join(runDir, "raw_traces_000001.jsonl"), "utf8")).toBe(previous);
    const manifest = JSON.parse(fs.readFileSync(manifestPath(), "utf8"));
    expect(manifest.segments).toHaveLength(1);
    expect(manifest.segments[0]).toMatchObject({ boundary_type: "runtime_switch", boundary_key: RENEWAL.key, runtime_kind: RuntimeKind.CLAUDE_AGENT_SDK });
    expect(lines(activePath())).toEqual([expect.objectContaining({ id: RENEWAL.markerTraceId, sender_id: "system.runtime_handover",
      content: "The saved Claude Agent SDK session of this run was no longer available, so a new session continues from the work journal." })]);
    // The hand-over notice is pending for the triggering input (derived from the marker, as after a switch).
    expect(readPendingRuntimeHandover(runDir)).toEqual({ markerTraceId: RENEWAL.markerTraceId, markerText: RENEWAL.markerText });
    expect(warn.mock.calls.filter((call: unknown[]) => call[0] === "RUNTIME_SESSION_LOST")).toEqual([
      ["RUNTIME_SESSION_LOST", { runId: RUN_ID, runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, lostPlatformAgentRunId: LOST }]]);
  });

  it.each([
    ["an auth error", () => new Error("Claude Code returned an error result: Invalid API key")],
    ["a network error", () => new Error("connect ECONNREFUSED")],
    ["a quarantined cleanup (AggregateError)", () => new AggregateError([new SavedRuntimeSessionMissingError(RuntimeKind.CLAUDE_AGENT_SDK, LOST),
      new Error("cleanup failed")], "AgentRun preparation and cleanup failed.")],
  ])("fails as today for %s: no fresh session, no marker, the metadata unchanged (AC-003)", async (_label, makeError) => {
    const error = makeError();
    const before = fs.readFileSync(activePath(), "utf8");
    const { service, newPreparation, getStored } = lifecycle({ restore: [async () => { throw error; }] });
    await expect(service.activateRunAgent(RUN_ID, HOST)).rejects.toBe(error);
    expect(newPreparation).not.toHaveBeenCalled();
    expect(fs.readFileSync(activePath(), "utf8")).toBe(before);
    expect(fs.existsSync(manifestPath())).toBe(false);
    expect(getStored()).toEqual(metadata());
    expect(warn.mock.calls.some((call: unknown[]) => call[0] === "RUNTIME_SESSION_LOST")).toBe(false);
  });

  it("keeps the error for a lifecycle built without the switch port: nothing changes", async () => {
    const before = fs.readFileSync(activePath(), "utf8");
    const { service, newPreparation } = lifecycle({ restore: [lostSession()] }, { switching: false });
    await expect(service.activateRunAgent(RUN_ID, HOST)).rejects.toBeInstanceOf(SavedRuntimeSessionMissingError);
    expect(newPreparation).not.toHaveBeenCalled();
    expect(fs.readFileSync(activePath(), "utf8")).toBe(before);
  });

  it("a failure after the marker, before the commit, completes on the next message with one marker and one segment (AC-004)", async () => {
    const previous = fs.readFileSync(activePath(), "utf8");
    const { service, getStored } = lifecycle({ restore: [lostSession(), lostSession()], fresh: [async () => freshCandidate(), async () => freshCandidate()] },
      { commit: ["fail", "ok"] });

    await expect(service.activateRunAgent(RUN_ID, HOST)).rejects.toThrow();
    expect(getStored().platformAgentRunId).toBe(LOST); // the commit did not land
    expect(lines(activePath())[0]!.id).toBe(RENEWAL.markerTraceId);

    const result = await service.activateRunAgent(RUN_ID, HOST);
    expect(result.metadata.platformAgentRunId).toBe(FRESH);
    expect(JSON.parse(fs.readFileSync(manifestPath(), "utf8")).segments).toHaveLength(1);
    expect(fs.readFileSync(path.join(runDir, "raw_traces_000001.jsonl"), "utf8")).toBe(previous);
    expect(lines(activePath()).filter((record) => record.id === RENEWAL.markerTraceId)).toHaveLength(1);
  });

  it("a failure before the marker changes nothing, and the next message tries again (AC-004)", async () => {
    const before = fs.readFileSync(activePath(), "utf8");
    const { service, getStored } = lifecycle({ restore: [lostSession(), lostSession()],
      fresh: [async () => { throw new Error("fresh session failed to start"); }, async () => freshCandidate()] });

    await expect(service.activateRunAgent(RUN_ID, HOST)).rejects.toThrow("fresh session failed to start");
    expect(fs.readFileSync(activePath(), "utf8")).toBe(before);
    expect(fs.existsSync(manifestPath())).toBe(false);
    expect(getStored().platformAgentRunId).toBe(LOST);

    await service.activateRunAgent(RUN_ID, HOST);
    expect(getStored().platformAgentRunId).toBe(FRESH);
    expect(JSON.parse(fs.readFileSync(manifestPath(), "utf8")).segments).toHaveLength(1);
  });
});
