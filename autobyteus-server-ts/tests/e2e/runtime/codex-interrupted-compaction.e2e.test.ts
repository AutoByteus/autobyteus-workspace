import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { createNoopAgentToolMcpRunSessionDeactivator } from "../../fixtures/agent-tool-mcp-run-session-deactivator-fixtures.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import { CodexAgentRunBackendFactory } from "../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.js";
import { CodexThreadBootstrapper } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { CodexThreadCleanup } from "../../../src/agent-execution/backends/codex/backend/codex-thread-cleanup.js";
import { CodexClientThreadRouter } from "../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import { CodexThreadManager } from "../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentRunResourceManager } from "../../../src/agent-execution/services/agent-run-resource-manager.js";
import { AgentRunActivationRegistry } from "../../../src/agent-execution/runtime/agent-run-activation-registry.js";
import { AgentRunMemoryRecorder } from "../../../src/agent-memory/services/agent-run-memory-recorder.js";
import { CodexModelCatalog } from "../../../src/llm-management/services/codex-model-catalog.js";
import { CodexAppServerClient } from "../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunViewProjectionService } from "../../../src/run-history/services/agent-run-view-projection-service.js";

// Live proof that an interrupted Codex automatic compaction is closed as failed (REQ-C01, AC-C01d)
// through the real AgentRun, Codex backend, app server and memory recorder. As in probe C10, the app
// server runs with `-c model_auto_compact_token_limit=20000` (test-only) so that a ~40K-token message
// makes the next turn start with an automatic compaction, which is interrupted at once. The turn after
// that compacts normally. Further cases end the run's compaction by terminating the run and by killing
// the app server (SCN-C4/C5). Gated: RUN_CODEX_E2E=1 (uses Codex quota: a few turns per case).
const codexBinaryReady = spawnSync("codex", ["--version"], { stdio: "ignore" }).status === 0;
const describeLive = codexBinaryReady && process.env.RUN_CODEX_E2E === "1" ? describe : describe.skip;
const TIMEOUT_MS = Number(process.env.CODEX_COMPACTION_E2E_TIMEOUT_MS || 240_000);
const dataDump = (label: string) => `Data dump ${label}. Do not analyze. Reply with exactly: OK ${label}\n` +
  Array.from({ length: 2000 }, (_, i) =>
    `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n");

const unusedBackendFactory: AgentRunBackendFactory = {
  createBackend: async () => { throw new Error("Unexpected backend factory use."); },
  restoreBackend: async () => { throw new Error("Unexpected backend restore use."); },
};
const noopSidecar = () => ({ attachToRun: () => () => undefined });
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (label: string, predicate: () => boolean, events: AgentRunEvent[]) => {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline && !predicate()) await delay(50);
  expect(predicate(), `${label}: ${JSON.stringify(events.map((event) => event.eventType).slice(-30))}`).toBe(true);
};

describeLive("Codex interrupted compaction (live E2E)", () => {
  const tempDirs: string[] = [];
  let clientManager: CodexAppServerClientManager | null = null;
  let threadManager: CodexThreadManager | null = null;
  let runId: string | null = null;

  afterEach(async () => {
    if (threadManager && runId) await threadManager.terminateThread(runId).catch(() => undefined);
    if (clientManager) await clientManager.close();
    clientManager = null; threadManager = null; runId = null;
    await Promise.all(tempDirs.splice(0).map((dir) => fsPromises.rm(dir, { recursive: true, force: true })));
  });

  /** Real AgentRunManager + Codex backend + app server (lowered auto-compaction limit) + memory recorder. */
  const startRun = async () => {
    const workspaceRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), "codex-compaction-workspace-"));
    const memoryDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "codex-compaction-memory-"));
    tempDirs.push(workspaceRoot, memoryDir);
    clientManager = new CodexAppServerClientManager({
      createClient: (cwd) => new CodexAppServerClient({ command: "codex",
        args: ["app-server", "-c", "model_auto_compact_token_limit=20000"], cwd, requestTimeoutMs: 45_000 }),
    });
    threadManager = new CodexThreadManager(clientManager, undefined, new CodexClientThreadRouter());
    const available = (await new CodexModelCatalog(clientManager).listModels(workspaceRoot))
      .map((model) => model.model_identifier);
    const model = [process.env.CODEX_COMPACTION_E2E_MODEL?.trim(), "gpt-5.6-luna", "gpt-5.4-mini", "gpt-5.6-sol"]
      .find((candidate): candidate is string => Boolean(candidate) && available.includes(candidate!));
    expect(model, `available Codex models: ${available.join(", ")}`).toBeTruthy();

    const recorder = new AgentRunMemoryRecorder();
    const deactivator = createNoopAgentToolMcpRunSessionDeactivator();
    const manager = new AgentRunManager({
      autoByteusBackendFactory: unusedBackendFactory,
      codexBackendFactory: new CodexAgentRunBackendFactory(threadManager, new CodexThreadBootstrapper(
        { activateForRun: () => ({ kind: "not_exposed" }) },
        { materializeConfiguredWorkspaceSkills: async () => ({ materializedSkills: [], effectiveRequests: [] }) } as never,
        { resolveWorkingDirectory: async () => workspaceRoot } as never,
        { getAgentDefinitionById: async () => ({ name: "Codex Compaction Agent", skillNames: [], toolNames: [],
          instructions: "Reply exactly as asked. Do not use tools.", description: "Compaction probe agent." }) } as never,
        { resolveConfiguredSkillBindingsForAgent: () => [], resolveSkillScope: () => "CONFIGURED",
          hasEffectiveSkills: () => false } as never,
        clientManager,
      ), new CodexThreadCleanup(undefined, clientManager)),
      claudeBackendFactory: unusedBackendFactory,
      agyBackendFactory: unusedBackendFactory,
      grokBackendFactory: unusedBackendFactory,
      activationRegistry: new AgentRunActivationRegistry(new AgentRunResourceManager({
        runSessions: deactivator, runFileChangeService: noopSidecar() as never,
        publishedArtifactRelayService: noopSidecar() as never, memoryRecorder: recorder })),
      memoryRecorder: recorder,
      providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
      agentToolMcpRunSessionDeactivator: deactivator,
    });
    runId = `run-codex-compaction-${randomUUID()}`;
    const run = (await manager.prepareNewAgentRun({ runId, config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, agentDefinitionId: "agent-def-codex-compaction", llmModelIdentifier: model!,
      autoExecuteTools: false, workspaceId: "workspace-codex-compaction", memoryDir, llmConfig: { reasoning_effort: "low" },
    }) })).commitPublication();
    const events: AgentRunEvent[] = [];
    run.subscribeToEvents((event) => { if (event && typeof event === "object") events.push(event as AgentRunEvent); });
    const turnsCompleted = () => events.filter((event) => event.eventType === AgentRunEventType.TURN_COMPLETED).length;
    const compactions = () => events.filter((event) => event.eventType === AgentRunEventType.COMPACTION_STATUS);

    return { manager, run, recorder, memoryDir, events, turnsCompleted, compactions };
  };

  /** Turn 1 fills the context; turn 2 starts with an automatic compaction. Resolves once it is running. */
  const reachRunningCompaction = async (started: Awaited<ReturnType<typeof startRun>>, label: string) => {
    const { run, events, turnsCompleted, compactions } = started;
    expect((await run.postUserMessage(new AgentInputUserMessage(dataDump(`${label}ONE`)))).accepted).toBe(true);
    await waitFor("first turn", () => turnsCompleted() === 1, events);
    expect((await run.postUserMessage(new AgentInputUserMessage(dataDump(`${label}TWO`)))).accepted).toBe(true);
    await waitFor("compaction started", () => compactions().some((event) => event.payload.status === "compacting"), events);
    return compactions().find((event) => event.payload.status === "compacting")!;
  };

  const markersOf = (memoryDir: string, providerEventId: unknown) => {
    const store = new RunMemoryFileStore(memoryDir);
    return [...store.listArchiveTurnRawTracesOrdered(), ...store.listTurnRawTracesOrdered()]
      .filter((trace) => trace.traceType === "provider_compaction_boundary")
      .map((trace) => trace.toolResult as Record<string, unknown>)
      .filter((marker) => marker.provider_event_id === providerEventId);
  };

  /** Reopens the run through the production run-history service (active traces + projection dedupe). */
  const reopenHistory = (memoryDir: string, historyRunId: string) =>
    new AgentRunViewProjectionService(path.dirname(memoryDir)).getProjectionFromMetadata({
      runId: historyRunId,
      metadata: { runId: historyRunId, agentDefinitionId: "agent-def-codex-compaction", workspaceRootPath: os.tmpdir(),
        memoryDir, llmModelIdentifier: "codex", llmConfig: null, autoExecuteTools: false,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null },
    });

  it("closes an interrupted automatic compaction as failed and archives only the later completed one", async () => {
    const started = await startRun();
    const { run, recorder, memoryDir, events, turnsCompleted, compactions } = started;
    // Turn 2 starts with an automatic compaction; interrupt while it is still running.
    const interrupted = await reachRunningCompaction(started, "");
    expect((await run.interrupt()).accepted).toBe(true);
    await waitFor("interrupted turn ended", () => turnsCompleted() === 2, events);
    expect(compactions().some((event) => event.payload.status === "compacted" &&
      event.payload.provider_event_id === interrupted.payload.provider_event_id),
    "the compaction finished before the interrupt landed; rerun").toBe(false);
    const failed = compactions().filter((event) => event.payload.status === "failed");
    expect(failed).toHaveLength(1);
    expect(failed[0]!.payload).toMatchObject({ source_surface: "codex.context_compaction_abandoned",
      provider_event_id: interrupted.payload.provider_event_id, turn_id: interrupted.payload.turn_id,
      rotation_eligible: false, error_message: "Compaction interrupted before it completed (turn interrupted)." });
    const failedIndex = events.indexOf(failed[0]!);
    const secondTurnEnd = events.filter((event) => event.eventType === AgentRunEventType.TURN_COMPLETED)[1]!;
    expect(failedIndex).toBeLessThan(events.indexOf(secondTurnEnd));

    // The next turn compacts again and completes normally.
    expect((await run.postUserMessage(new AgentInputUserMessage("Reply with exactly: OK AFTER"))).accepted).toBe(true);
    await waitFor("third turn", () => turnsCompleted() === 3, events);
    const completed = compactions().filter((event) => event.payload.status === "compacted");
    expect(completed).toHaveLength(1);
    expect(completed[0]!.payload.provider_event_id).not.toBe(interrupted.payload.provider_event_id);

    await recorder.waitForIdle(run.runId);
    const store = new RunMemoryFileStore(memoryDir);
    expect(store.readRawTraceArchiveManifest().segments.map((segment) => segment.boundary_key))
      .toEqual([String(completed[0]!.payload.boundary_key)]);
    const markers = [...store.listArchiveTurnRawTracesOrdered(), ...store.listTurnRawTracesOrdered()]
      .filter((trace) => trace.traceType === "provider_compaction_boundary")
      .map((trace) => trace.toolResult as Record<string, unknown>);
    expect(markers.filter((marker) => marker.provider_event_id === interrupted.payload.provider_event_id)
      .map((marker) => marker.status)).toEqual(["compacting", "failed"]);

    // Reopened history: the interrupted operation was archived with the later boundary; the active segment
    // shows only the completed compaction, and no compaction is left "started".
    const history = await reopenHistory(memoryDir, run.runId);
    const historyCompactions = history.activities.filter((activity) => activity.kind === "compaction");
    expect(historyCompactions.map((activity) => (activity as { phase?: string }).phase)).toEqual(["completed"]);
  }, TIMEOUT_MS * 4);

  // AgentRun termination quiesces input and waits for the active turn before the backend terminates, so a
  // compaction running at Terminate ends with its turn (normally it completes). The backend's run_terminated
  // close is a defensive path, covered by unit tests. Real-use invariant here: the compaction is never left open.
  it("never leaves a compaction open when the run is terminated while it is running", async () => {
    const started = await startRun();
    const { manager, run, recorder, memoryDir, events, compactions } = started;
    const open = await reachRunningCompaction(started, "T");
    expect(await manager.terminateAgentRun(run.runId)).toBe(true);
    const terminal = compactions().filter((event) => event.payload.provider_event_id === open.payload.provider_event_id &&
      (event.payload.status === "compacted" || event.payload.status === "failed"));
    expect(terminal, JSON.stringify(compactions().map((event) => event.payload.status))).toHaveLength(1);
    await recorder.waitForIdle(run.runId).catch(() => undefined);
    const terminalStatus = String(terminal[0]!.payload.status);
    expect(markersOf(memoryDir, open.payload.provider_event_id).map((marker) => marker.status))
      .toEqual(["compacting", terminalStatus]);
    expect(new RunMemoryFileStore(memoryDir).readRawTraceArchiveManifest().segments)
      .toHaveLength(terminalStatus === "compacted" ? 1 : 0);
    const history = await reopenHistory(memoryDir, run.runId);
    const phases = history.activities.filter((activity) => activity.kind === "compaction")
      .map((activity) => (activity as { phase?: string }).phase);
    expect(phases).toHaveLength(1);
    expect(phases[0]).not.toBe("started");
    console.info(`Codex compaction at terminate ended as: ${terminalStatus}`);
    expect(events.filter((event) => event.eventType === AgentRunEventType.ERROR)).toHaveLength(0);
  }, TIMEOUT_MS * 4);

  it("closes a compaction cut off by an app-server crash as failed before the runtime error", async () => {
    const started = await startRun();
    const { run, recorder, memoryDir, events, compactions } = started;
    const open = await reachRunningCompaction(started, "K");
    // The app server this test's client manager spawned (a direct child of this worker process).
    const appServerPids = spawnSync("pgrep", ["-P", String(process.pid), "-f", "model_auto_compact_token_limit"],
      { encoding: "utf-8" }).stdout.split(/\s+/u).map(Number).filter((pid) => Number.isInteger(pid) && pid > 0);
    expect(appServerPids).toHaveLength(1);
    process.kill(appServerPids[0]!, "SIGKILL");
    await waitFor("runtime error", () => events.some((event) => event.eventType === AgentRunEventType.ERROR), events);
    expect(compactions().some((event) => event.payload.status === "compacted" &&
      event.payload.provider_event_id === open.payload.provider_event_id),
    "the compaction finished before the crash landed; rerun").toBe(false);
    const failed = compactions().filter((event) => event.payload.status === "failed");
    expect(failed).toHaveLength(1);
    expect(failed[0]!.payload).toMatchObject({ provider_event_id: open.payload.provider_event_id, rotation_eligible: false,
      error_message: "Compaction did not complete (Codex app server closed)." });
    const errorEvent = events.find((event) => event.eventType === AgentRunEventType.ERROR)!;
    expect(events.indexOf(failed[0]!)).toBeLessThan(events.indexOf(errorEvent));
    await recorder.waitForIdle(run.runId);
    expect(markersOf(memoryDir, open.payload.provider_event_id).map((marker) => marker.status)).toEqual(["compacting", "failed"]);
    expect(new RunMemoryFileStore(memoryDir).readRawTraceArchiveManifest().segments).toHaveLength(0);
    const history = await reopenHistory(memoryDir, run.runId);
    expect(history.activities.filter((activity) => activity.kind === "compaction")
      .map((activity) => (activity as { phase?: string }).phase)).toEqual(["failed"]);
  }, TIMEOUT_MS * 4);
});
