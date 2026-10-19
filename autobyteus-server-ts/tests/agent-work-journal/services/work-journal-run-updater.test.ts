import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRunBackend } from "../../../src/agent-execution/backends/agent-run-backend.js";
import { AgentRunResourceManager } from "../../../src/agent-execution/services/agent-run-resource-manager.js";
import { AgentRunMemoryRecorder } from "../../../src/agent-memory/services/agent-run-memory-recorder.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { WorkJournalRunUpdater } from "../../../src/agent-work-journal/services/work-journal-run-updater.js";
import { WorkJournalService } from "../../../src/agent-work-journal/services/work-journal-service.js";
import type { WorkJournalPackage } from "../../../src/agent-work-journal/domain/work-journal-models.js";
import { makeRunDir, makeTempMemoryRoot, rotateActive, turnRecords, writeActive } from "../raw-trace-folder-fixtures.js";

const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const newRunDir = (): string => {
  const root = makeTempMemoryRoot();
  roots.push(root);
  return makeRunDir(root, "run-1");
};

/** A real AgentRun over a scripted backend (the shape of agent-run-memory-recorder.test.ts). */
const createRun = (input: { runtimeKind: RuntimeKind; memoryDir: string | null; recorder?: AgentRunMemoryRecorder }) => {
  const config = new AgentRunConfig({
    runtimeKind: input.runtimeKind,
    agentDefinitionId: "agent-def-1",
    llmModelIdentifier: "model-1",
    autoExecuteTools: false,
    workspaceId: "workspace-1",
    memoryDir: input.memoryDir,
  });
  const context = new AgentRunContext({ runId: "run-1", config, runtimeContext: null });
  const backend: AgentRunBackend = {
    runId: "run-1",
    runtimeKind: input.runtimeKind,
    compactionRecovery: { kind: "unsupported" } as const,
    inputCapabilities: { activeTurnAppend: "unsupported" },
    getContext: () => context,
    isActive: () => true,
    hasRunningBackgroundTasks: () => false,
    getPlatformAgentRunId: () => "platform-run-1",
    getLifecycleSnapshot: () => ({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } }),
    subscribeToSourceEventBatches: () => () => undefined,
    dispatchUserInput: vi.fn(async () => ({ forwarded: true, turnId: "turn-1" })),
    approveToolInvocation: vi.fn(async () => ({ accepted: true })),
    interrupt: vi.fn(async () => ({ accepted: true })),
    terminate: vi.fn(async () => ({ accepted: true })),
  };
  return new AgentRun({
    providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch },
    context,
    backend,
    commandObservers: input.recorder ? [input.recorder] : [],
  });
};

const event = (eventType: AgentRunEventType, payload: Record<string, unknown> = { turn_id: "turn-1" }): AgentRunEvent =>
  ({ eventType, runId: "run-1", payload, statusHint: null });

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

const PACKAGE: WorkJournalPackage = { rootPath: "/r", manifestPath: "/r/m", files: [], evidenceHash: "h" };

describe("WorkJournalRunUpdater (DS-001)", () => {
  it("N1: attached after the recorder, the journal includes the assistant text the recorder flushes on TURN_COMPLETED", async () => {
    const memoryDir = newRunDir();
    const recorder = new AgentRunMemoryRecorder();
    const updater = new WorkJournalRunUpdater({ memoryRecorder: recorder, journalService: new WorkJournalService() });
    const run = createRun({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, memoryDir, recorder });
    const resources = new AgentRunResourceManager({
      runSessions: { deactivateForRun: () => 0 },
      runFileChangeService: { attachToRun: () => () => undefined },
      publishedArtifactRelayService: { attachToRun: () => () => undefined },
      memoryRecorder: recorder,
      workJournalUpdater: updater,
    });
    resources.attach(run);

    const forwarded = vi.spyOn(recorder, "onUserMessageForwarded");
    await run.postUserMessage(new AgentInputUserMessage("Summarize the repo"));
    await vi.waitFor(() => expect(forwarded).toHaveBeenCalledOnce());
    await run.publishEvent(event(AgentRunEventType.TURN_STARTED));
    await run.publishEvent(event(AgentRunEventType.SEGMENT_START, { turn_id: "turn-1", id: "seg-1", segment_type: "text" }));
    await run.publishEvent(event(AgentRunEventType.SEGMENT_CONTENT, { turn_id: "turn-1", id: "seg-1", delta: "The repo has two packages." }));
    // No SEGMENT_END: the recorder flushes the open segment when the turn completes.
    await run.publishEvent(event(AgentRunEventType.TURN_COMPLETED));
    await updater.waitForIdle("run-1");

    const journal = fs.readFileSync(path.join(memoryDir, "work_journal", "work_journal_active.md"), "utf-8");
    expect(journal).toContain("User: Summarize the repo");
    expect(journal).toContain("Agent: The repo has two packages.");
    expect(resources.release("run-1", run).detached).toMatchObject({ memoryRecorder: true, workJournal: true });
  });

  it("the resource manager attaches the journal updater after the memory recorder", () => {
    const order: string[] = [];
    const sidecar = (name: string) => ({ attachToRun: () => { order.push(name); return () => undefined; } });
    new AgentRunResourceManager({
      runSessions: { deactivateForRun: () => 0 },
      runFileChangeService: sidecar("fileChanges"),
      publishedArtifactRelayService: sidecar("artifactRelay"),
      memoryRecorder: sidecar("memoryRecorder"),
      workJournalUpdater: sidecar("workJournal"),
    }).attach(createRun({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, memoryDir: null }));
    expect(order).toEqual(["fileChanges", "artifactRelay", "memoryRecorder", "workJournal"]);
  });

  it("a compaction writes the closed journal file; AutoByteus runs (no recorder queue) are updated too", async () => {
    const memoryDir = newRunDir();
    const recorder = new AgentRunMemoryRecorder();
    const updater = new WorkJournalRunUpdater({ memoryRecorder: recorder, journalService: new WorkJournalService() });
    const run = createRun({ runtimeKind: RuntimeKind.AUTOBYTEUS, memoryDir });
    recorder.attachToRun(run);
    updater.attachToRun(run);
    writeActive(memoryDir, turnRecords("turn_1", "ls", "a.ts"));
    rotateActive(memoryDir);
    await run.publishEvent(event(AgentRunEventType.COMPACTION_STATUS, { status: "compacted", turn_id: "turn-1" }));
    await updater.waitForIdle("run-1");
    const closed = fs.readFileSync(path.join(memoryDir, "work_journal", "work_journal_000001.md"), "utf-8");
    expect(closed).toContain("Runtime AutoByteus · file 000001 (closed)");
  });

  it("a burst of events is merged into at most one more update; other events do not update", async () => {
    const memoryDir = newRunDir();
    const gate = deferred();
    const ensureCurrent = vi.fn(async () => { await gate.promise; return PACKAGE; });
    const waitForIdle = vi.fn(async () => undefined);
    const updater = new WorkJournalRunUpdater({ memoryRecorder: { waitForIdle }, journalService: { ensureCurrent } });
    const run = createRun({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, memoryDir });
    updater.attachToRun(run);

    await run.publishEvent(event(AgentRunEventType.SEGMENT_CONTENT, { turn_id: "turn-1", id: "s", segment_type: "text", delta: "x" }));
    expect(ensureCurrent).not.toHaveBeenCalled();
    await run.publishEvent(event(AgentRunEventType.TURN_COMPLETED));
    await vi.waitFor(() => expect(ensureCurrent).toHaveBeenCalledTimes(1));
    for (const type of [AgentRunEventType.TURN_COMPLETED, AgentRunEventType.COMPACTION_STATUS, AgentRunEventType.TURN_INTERRUPTED]) {
      await run.publishEvent(event(type));
    }
    gate.resolve();
    await updater.waitForIdle("run-1");
    expect(ensureCurrent).toHaveBeenCalledTimes(2);
    expect(waitForIdle).toHaveBeenCalledTimes(2);
    expect(waitForIdle).toHaveBeenCalledWith("run-1");
    expect(ensureCurrent).toHaveBeenCalledWith({ runId: "run-1", memoryDir, runtimeKind: RuntimeKind.CODEX_APP_SERVER });
  });

  it("a journal failure is logged and never reaches the run; the raw traces are untouched (AC-W6)", async () => {
    const memoryDir = newRunDir();
    writeActive(memoryDir, turnRecords("turn_1", "ls", "a.ts"));
    const rawBefore = fs.readFileSync(path.join(memoryDir, "raw_traces_active.jsonl"), "utf-8");
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ensureCurrent = vi.fn().mockRejectedValueOnce(new Error("disk full")).mockResolvedValue(PACKAGE);
    const updater = new WorkJournalRunUpdater({ memoryRecorder: { waitForIdle: async () => undefined }, journalService: { ensureCurrent } });
    const run = createRun({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, memoryDir });
    updater.attachToRun(run);

    await expect(run.publishEvent(event(AgentRunEventType.TURN_COMPLETED))).resolves.toBeUndefined();
    await vi.waitFor(() => expect(ensureCurrent).toHaveBeenCalledTimes(1));
    await updater.waitForIdle("run-1");
    expect(error).toHaveBeenCalledWith("[WorkJournalRunUpdater] journal update failed for run 'run-1': Error: disk full");
    expect(fs.readFileSync(path.join(memoryDir, "raw_traces_active.jsonl"), "utf-8")).toBe(rawBefore);

    await run.publishEvent(event(AgentRunEventType.TURN_COMPLETED));
    await vi.waitFor(() => expect(ensureCurrent).toHaveBeenCalledTimes(2));
  });

  it("a run without a memory folder is not followed; after detach no update runs", async () => {
    const ensureCurrent = vi.fn(async () => PACKAGE);
    const updater = new WorkJournalRunUpdater({ memoryRecorder: { waitForIdle: async () => undefined }, journalService: { ensureCurrent } });
    const withoutFolder = createRun({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, memoryDir: null });
    const subscribe = vi.spyOn(withoutFolder, "subscribeToEvents");
    updater.attachToRun(withoutFolder)();
    expect(subscribe).not.toHaveBeenCalled();

    const run = createRun({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, memoryDir: newRunDir() });
    const detach = updater.attachToRun(run);
    detach();
    await run.publishEvent(event(AgentRunEventType.TURN_COMPLETED));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(ensureCurrent).not.toHaveBeenCalled();
  });
});
