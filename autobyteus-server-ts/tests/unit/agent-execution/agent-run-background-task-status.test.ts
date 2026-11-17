/**
 * autobyteus-448 part 2, DS-101 (REQ-006, AC-005; the design's "Example Sequence"): every status a run publishes carries
 * its running background task count, from the one derivation over its backend's background-task view, recomputed
 * before each source batch and before each snapshot. Turn starts → task starts → turn ends → reload → task ends → wake:
 * running 0 → running 1 → idle 1 → idle 1 → idle 0 → running 0. Through a scripted event-stream backend, the scripted
 * Antigravity backend and the native backend with its real process manager. Messages are delivered at once (AC-006).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/agent-execution/backends/antigravity/stream/agy-native-tool-arguments-reader.js", () => ({
  readAgyNativeToolArguments: vi.fn().mockResolvedValue(null),
}));
const scanAgyTaskExitMessages = vi.hoisted(() => vi.fn());
vi.mock("../../../src/agent-execution/backends/antigravity/stream/agy-task-exit-message-reader.js", () => ({ scanAgyTaskExitMessages }));

import { getBackgroundManager } from "autobyteus-ts";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentBackgroundTask } from "../../../src/agent-execution/domain/agent-background-task.js";
import type { AgentRunBackendInputDispatch } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { AgyAgentRunBackend } from "../../../src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.js";
import { AutoByteusAgentRunBackend } from "../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.js";
import type { AgyStreamMessage } from "../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { stubAgyAgentTools, stubAutoByteusRunTools } from "../../helpers/agent-tool-mcp-run-sessions-stub.js";
import { stubAgyCapsuleSkills } from "../../fixtures/run-workspace-skills-fixtures.js";

const contextOf = (runId: string, runtimeKind: RuntimeKind, runtimeContext: unknown = null) => new AgentRunContext({
  runId, config: new AgentRunConfig({ runtimeKind, agentDefinitionId: "def", llmModelIdentifier: "m", autoExecuteTools: false,
    workspaceId: null, llmConfig: null, memoryDir: null }), runtimeContext: runtimeContext as never,
});
const runOver = (context: AgentRunContext, backend: unknown) => {
  const run = new AgentRun({ providerInputNormalizer: { normalizeForProvider: (dispatch: AgentRunBackendInputDispatch) => dispatch },
    context, backend: backend as never, commandObservers: [] });
  const published: AgentRunEvent[] = [];
  run.subscribeToEvents((event) => { published.push(event); });
  /** Each published status as [status, count], repeats collapsed (what a screen shows, in order). */
  const shown = () => published.filter((event) => event.eventType === AgentRunEventType.AGENT_STATUS)
    .map((event) => [event.payload.status, event.payload.background_tasks_running] as const)
    .filter((entry, index, all) => index === 0 || entry[0] !== all[index - 1]![0] || entry[1] !== all[index - 1]![1]);
  return { run, published, shown };
};
const message = (content: string) => new AgentInputUserMessage(content, SenderType.USER, null, {});
const cleanups: Array<() => Promise<unknown> | unknown> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

describe("the example sequence through a scripted event-stream backend", () => {
  it("running 0 → running 1 → idle 1 (Background task running) → snapshot idle 1 → idle 0 → running 0 (wake); input dispatched at once", async () => {
    const tasks: AgentBackgroundTask[] = [];
    let emit: (batch: AgentRunEvent[]) => void = () => undefined;
    let phase: "idle" | "running" = "idle";
    let turnId = "turn-1";
    const dispatchUserInput = vi.fn(async (_dispatch: AgentRunBackendInputDispatch) => ({ forwarded: true as const, turnId: "turn-2" }));
    const context = contextOf("run-seq", RuntimeKind.CLAUDE_AGENT_SDK);
    const backend = {
      runId: "run-seq", runtimeKind: context.config.runtimeKind,
      compactionRecovery: { kind: "unsupported" } as const, backgroundTaskNotices: { kind: "unsupported" } as const,
      backgroundTaskInspection: { kind: "event-stream" as const, current: () => [...tasks] },
      inputCapabilities: { activeTurnAppend: "supported" },
      getContext: () => context, getPlatformAgentRunId: () => "run-seq", isActive: () => true,
      getLifecycleSnapshot: () => ({ availability: "active", phase, currentTurn: phase === "running" ? { kind: "IDENTIFIED", turnId } : { kind: "NONE" } }),
      subscribeToSourceEventBatches: (listener: (batch: AgentRunEvent[]) => void) => { emit = listener; return () => undefined; },
      dispatchUserInput, approveToolInvocation: vi.fn(), interrupt: vi.fn(), terminate: vi.fn(), applyDefinitionTools: vi.fn(), getToolNames: () => [],
    };
    const { run, shown } = runOver(context, backend);
    const event = (eventType: AgentRunEventType, payload: Record<string, unknown> = {}): AgentRunEvent =>
      ({ eventType, runId: "run-seq", payload: { turn_id: turnId, ...payload }, statusHint: null }) as AgentRunEvent;
    const task = (status: AgentBackgroundTask["status"]): AgentBackgroundTask =>
      ({ taskId: "t1", kind: "shell", description: "pnpm build", command: "pnpm build", status, summary: null, startedAt: "2026-11-17T10:00:00.000Z" });

    phase = "running";
    emit([event(AgentRunEventType.TURN_STARTED)]);                                         // 1 turn starts
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["running", 0]));
    tasks.push(task("running"));
    emit([event(AgentRunEventType.BACKGROUND_TASK_UPDATED, { task_id: "t1", status: "running" })]); // 2 task starts
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["running", 1]));
    phase = "idle";
    emit([event(AgentRunEventType.TURN_COMPLETED)]);                                       // 3 turn ends
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["idle", 1]));
    expect(run.getStatusSnapshot()).toMatchObject({ status: "idle", background_tasks_running: 1 }); // 4 reload
    tasks.splice(0, 1, task("completed"));
    emit([event(AgentRunEventType.BACKGROUND_TASK_UPDATED, { task_id: "t1", status: "completed" })]); // 5 task ends
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["idle", 0]));
    expect(shown()).toEqual([["running", 0], ["running", 1], ["idle", 1], ["idle", 0]]);

    // 6 the wake (338's notice is the run's next input): dispatched at once, and its turn shows "Running" (AC-006).
    tasks.splice(0);
    await run.postUserMessage(message("The background task finished."));
    expect(dispatchUserInput).toHaveBeenCalledTimes(1);
    phase = "running";
    turnId = "turn-2";
    emit([event(AgentRunEventType.TURN_STARTED)]);
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["running", 0]));
  });

  it("a message to a run idle with background tasks is dispatched at once, not held (AC-006, DEC-005)", async () => {
    const context = contextOf("run-msg", RuntimeKind.CLAUDE_AGENT_SDK);
    const dispatchUserInput = vi.fn(async () => ({ forwarded: true as const, turnId: "turn-2" }));
    const backend = {
      runId: "run-msg", runtimeKind: context.config.runtimeKind,
      compactionRecovery: { kind: "unsupported" } as const, backgroundTaskNotices: { kind: "unsupported" } as const,
      backgroundTaskInspection: { kind: "event-stream" as const, current: () => [{ taskId: "t", kind: "shell" as const, description: "x", command: "x",
        status: "running" as const, summary: null, startedAt: "2026-11-17T10:00:00.000Z" }] },
      inputCapabilities: { activeTurnAppend: "supported" },
      getContext: () => context, getPlatformAgentRunId: () => "run-msg", isActive: () => true,
      getLifecycleSnapshot: () => ({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } }),
      subscribeToSourceEventBatches: () => () => undefined,
      dispatchUserInput, approveToolInvocation: vi.fn(), interrupt: vi.fn(), terminate: vi.fn(), applyDefinitionTools: vi.fn(), getToolNames: () => [],
    };
    const { run } = runOver(context, backend);
    expect(run.getStatusSnapshot()).toMatchObject({ status: "idle", background_tasks_running: 1 });
    await run.postUserMessage(message("Is the build done?"));
    expect(dispatchUserInput).toHaveBeenCalledTimes(1);
    expect(dispatchUserInput.mock.calls[0]![0]).toMatchObject({ kind: "start_turn" });
  });
});

describe("the example sequence through the scripted Antigravity backend (event-stream: its daemon steps)", () => {
  const conversationId = "3d5ce362-1127-4d6b-8259-4a2c04d7d876";
  class FakeProcess {
    private listeners: Array<(message: AgyStreamMessage) => void> = [];
    readonly sent: string[] = [];
    subscribe(listener: (message: AgyStreamMessage) => void) { this.listeners.push(listener); return () => undefined; }
    onClose() { return () => undefined; }
    async sendUserMessage(content: string) { this.sent.push(content); }
    async stop() { /* no provider process */ }
    emit(message: AgyStreamMessage) { this.listeners.forEach((listener) => listener(message)); }
  }
  const daemon: AgyStreamMessage = { event: "step_update", step_update: { conversation_id: conversationId, step_index: 2, step_type: "tool",
    state: "ACTIVE", tool_name: "run_command", tool_info: { parameters: { CommandLine: "python3 -m http.server" } } } };
  const result = (response: string): AgyStreamMessage => ({ event: "result", result: { conversation_id: conversationId, status: "SUCCESS", response } });

  it("turn starts → daemon starts → turn ends (idle 1) → reload (idle 1) → daemon exits (idle 0) → next input (running 0)", async () => {
    scanAgyTaskExitMessages.mockReset();
    scanAgyTaskExitMessages.mockReturnValue({ settledFiles: [], exits: [], problem: null });
    const context = contextOf("run-agy", RuntimeKind.ANTIGRAVITY_CLI, { conversationId });
    const process = new FakeProcess();
    const backend = new AgyAgentRunBackend(context as never, process as never, { compactionDetection: false },
      stubAgyAgentTools("run-agy"), stubAgyCapsuleSkills("run-agy"));
    cleanups.push(() => backend.terminate());
    const { run, shown } = runOver(context, backend);

    await run.postUserMessage(message("start a dev server"));
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["running", 0]));
    process.emit(daemon);
    process.emit(result("Dev server started."));
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["idle", 1]));
    expect(run.getStatusSnapshot()).toMatchObject({ status: "idle", background_tasks_running: 1 });

    scanAgyTaskExitMessages.mockReturnValue({ settledFiles: ["m.json"], problem: null,
      exits: [{ stepIndex: 2, exitCode: 0, summary: "The command exited with code 0." }] });
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["idle", 0]), { timeout: 6_000, interval: 50 });
    expect(run.getStatusSnapshot()).toMatchObject({ status: "idle", background_tasks_running: 0 });

    await run.postUserMessage(message("Is it still serving?"));
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["running", 0]));
    expect(process.sent).toHaveLength(2);
  }, 15_000);
});

const nativeSuite = process.platform === "win32" ? describe.skip : describe;
nativeSuite("the native backend with its real process manager (event-stream: run_bash background processes)", () => {
  it("an idle run's status follows its background process: idle 1 while it runs, idle 0 when it ends; a reload reads the same", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "native-bg-status-"));
    const agentContext = { agentId: `native-bg-status-${process.pid}` };
    const manager = getBackgroundManager(agentContext);
    cleanups.push(() => manager.scope.close(), () => manager.stopAllForRunEnd(), () => fs.rmSync(cwd, { recursive: true, force: true }));
    const context = contextOf("agent-native", RuntimeKind.AUTOBYTEUS);
    const backend = new AutoByteusAgentRunBackend(context, {
      agentId: "agent-native", getCompactionRecovery: () => null, authorizeCompactionRetry: () => "stale",
      revokeUnusedCompactionRetry: () => "stale", currentStatus: "idle", context: agentContext as never,
    }, { isActive: () => true, removeAgent: vi.fn().mockResolvedValue(true), tools: stubAutoByteusRunTools() });
    const { run, shown } = runOver(context, backend);
    expect(run.getStatusSnapshot()).toMatchObject({ status: "idle", background_tasks_running: 0 });

    await manager.run("sleep 0.4", cwd, { background: true });
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["idle", 1]));
    expect(run.getStatusSnapshot()).toMatchObject({ status: "idle", background_tasks_running: 1 });
    await vi.waitFor(() => expect(shown().at(-1)).toEqual(["idle", 0]), { timeout: 5_000, interval: 20 });
    expect(run.getStatusSnapshot()).toMatchObject({ status: "idle", background_tasks_running: 0 });
  });
});

describe("runtimes without a live view (Codex snapshot, ACP unsupported) are unchanged", () => {
  it.each([["codex", { kind: "snapshot" as const, inspect: vi.fn() }], ["acp", { kind: "unsupported" as const }]])(
    "%s: every status carries 0, as the quiet check reads it", (_name, inspection) => {
      const context = contextOf(`run-${_name}`, RuntimeKind.CODEX_APP_SERVER);
      const backend = {
        runId: `run-${_name}`, runtimeKind: context.config.runtimeKind,
        compactionRecovery: { kind: "unsupported" } as const, backgroundTaskNotices: { kind: "unsupported" } as const,
        backgroundTaskInspection: inspection, inputCapabilities: { activeTurnAppend: "unsupported" },
        getContext: () => context, getPlatformAgentRunId: () => context.runId, isActive: () => true,
        getLifecycleSnapshot: () => ({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } }),
        subscribeToSourceEventBatches: () => () => undefined,
        dispatchUserInput: vi.fn(), approveToolInvocation: vi.fn(), interrupt: vi.fn(), terminate: vi.fn(), applyDefinitionTools: vi.fn(), getToolNames: () => [],
      };
      const { run } = runOver(context, backend);
      expect(run.getStatusSnapshot()).toMatchObject({ status: "idle", background_tasks_running: 0 });
      expect(run.hasRunningBackgroundTasks()).toBe(false);
    });
});
