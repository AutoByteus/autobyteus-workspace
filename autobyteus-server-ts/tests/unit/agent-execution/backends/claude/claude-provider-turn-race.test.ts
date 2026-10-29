/**
 * Regression (segment-lifecycle-error-flood, AC-001..AC-003): Claude starts turns on its own
 * right after another turn (a background task finished), all before AutoByteus processed the
 * queued events. The runtime's live state is then ahead of the queue; neither turn may lose text
 * and the run must report `running` while the newer turn works.
 * Real ClaudeSession on a scripted SDK stream -> real ClaudeAgentRunBackend -> real AgentRun,
 * with run memory recorded by the real accumulator.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig } from "../../../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSession } from "../../../../../src/agent-execution/backends/claude/session/claude-session.js";
import { ClaudeProviderSessionLifecycle } from "../../../../../src/agent-execution/backends/claude/session/claude-provider-session-lifecycle.js";
import { ClaudeSessionMessageCache } from "../../../../../src/agent-execution/backends/claude/session/claude-session-message-cache.js";
import { ClaudeSessionToolUseCoordinator } from "../../../../../src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.js";
import { ClaudeAgentRunBackend } from "../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend.js";
import { AgentRun } from "../../../../../src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { buildRuntimeAgentToolExposure } from "../../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { RuntimeMemoryEventAccumulator } from "../../../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { createFakeClaudeSdkClient, flushClaudeSession } from "../../../../helpers/fake-claude-streaming-sdk.js";
import { createAgentToolMcpRunSessionsStub } from "../../../../helpers/agent-tool-mcp-run-sessions-stub.js";

const SID = "11111111-1111-4111-8111-111111111111";
const memoryDirs: string[] = [];

afterEach(() => {
  for (const dir of memoryDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const createHarness = () => {
  const memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-provider-turn-race-"));
  memoryDirs.push(memoryDir);
  const sdkClient = createFakeClaudeSdkClient({ providerSessionId: SID });
  let sessionRef: ClaudeSession | null = null;
  const toolingCoordinator = new ClaudeSessionToolUseCoordinator(new Map(), new Map(),
    (_context, event) => sessionRef?.emitRuntimeEvent(event));
  const runContext = new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({ agentDefinitionId: "agent-1", llmModelIdentifier: "haiku", autoExecuteTools: true,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, memoryDir: null, llmConfig: null }),
    runtimeContext: new ClaudeAgentRunContext({
      sessionConfig: buildClaudeSessionConfig({ model: "haiku", workingDirectory: "/tmp", permissionMode: "default",
        autoExecuteTools: true, llmConfig: null }),
      carpenterSystemPrompt: "x", runtimeToolExposure: buildRuntimeAgentToolExposure([]), sessionId: null,
    }),
  });
  const session = new ClaudeSession({
    runContext,
    providerSessionLifecycle: ClaudeProviderSessionLifecycle.reserveNew(() => SID),
    dependencies: {
      sessionMessageCache: new ClaudeSessionMessageCache(), sdkClient: sdkClient as never, toolingCoordinator,
      agentToolMcpRunSessions: createAgentToolMcpRunSessionsStub() as never, systemInstructionCaptureService: undefined,
      isRunSessionActive: () => true, terminateRunSession: vi.fn(async () => undefined),
    },
  });
  sessionRef = session;
  const backend = new ClaudeAgentRunBackend(runContext as never, session);
  const run = new AgentRun({ providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch }, context: runContext as never, backend });
  const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
  const memory = new RuntimeMemoryEventAccumulator({ runId: "run-1", writer, toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups() });
  const observed: AgentRunEvent[] = [];
  run.subscribeToEvents((event) => {
    observed.push(event);
    memory.recordRunEvent(event);
  });
  const recordedAssistantText = () => new RunMemoryFileStore(memoryDir).listTurnRawTracesOrdered()
    .filter((trace) => trace.traceType === "assistant")
    .map((trace) => trace.content);
  return { sdkClient, run, observed, recordedAssistantText };
};

const settle = async () => {
  for (let index = 0; index < 20; index += 1) {
    await flushClaudeSession();
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
};

const lifecycleNotices = (events: AgentRunEvent[]) => events.filter((event) =>
  event.eventType === AgentRunEventType.ERROR && event.payload.code === "AGENT_SEGMENT_LIFECYCLE_INVALID");
const deliveredText = (events: AgentRunEvent[]) => events
  .filter((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT)
  .map((event) => String(event.payload.delta));

/** An input turn starts a background task and completes; then the task completes. */
const finishInputTurnWithBackgroundTask = async (harness: ReturnType<typeof createHarness>) => {
  await harness.run.postUserMessage(new AgentInputUserMessage("start the dev stack in the background"));
  await settle();
  const fake = harness.sdkClient.current;
  fake.init();
  fake.emit(
    { type: "system", subtype: "background_tasks_changed", session_id: SID, tasks: [{ task_id: "bg-1", task_type: "local_bash", description: "Wait for readiness" }] },
    { type: "system", subtype: "task_started", session_id: SID, task_id: "bg-1", description: "Wait for readiness", task_type: "local_bash" },
  );
  fake.assistantText("I'll wait for the readiness notification.");
  fake.result([fake.sent[0]!.uuid]);
  await settle();
  fake.emit(
    { type: "system", subtype: "background_tasks_changed", session_id: SID, tasks: [] },
    { type: "system", subtype: "task_notification", session_id: SID, task_id: "bg-1", status: "completed", output_file: "/tmp/bg-1.out", summary: "done" },
  );
  return fake;
};

describe("Claude provider-initiated turns back to back", () => {
  it("delivers and records the second turn's text and reports running while it works (AC-001, AC-003)", async () => {
    const harness = createHarness();
    const fake = await finishInputTurnWithBackgroundTask(harness);

    // A task-notification turn without model output, then a turn Claude starts on its own,
    // all in one burst before the queue drains.
    fake.init();
    fake.result([], { origin: { kind: "task-notification" } });
    fake.init();
    fake.assistantText("The stack is ready; continuing the rendered board check.");
    await settle();
    const statusMidTurn = harness.run.getStatusSnapshot().status;
    fake.assistantText("Seeding the test Project now.");
    fake.result([]);
    await settle();

    expect(lifecycleNotices(harness.observed)).toEqual([]);
    expect(deliveredText(harness.observed)).toEqual([
      "I'll wait for the readiness notification.",
      "The stack is ready; continuing the rendered board check.",
      "Seeding the test Project now.",
    ]);
    expect(statusMidTurn).toBe("running");
    expect(harness.run.getStatusSnapshot().status).toBe("idle");
    expect(harness.recordedAssistantText()).toEqual([
      "I'll wait for the readiness notification.",
      "The stack is ready; continuing the rendered board check.",
      "Seeding the test Project now.",
    ]);
  });

  it("keeps the first provider turn's queued text when the runtime has already moved on (AC-002)", async () => {
    const harness = createHarness();
    const fake = await finishInputTurnWithBackgroundTask(harness);

    fake.init();
    fake.assistantText("Background task finished; checking.");
    fake.result([], { origin: { kind: "task-notification" } });
    fake.init();
    fake.assistantText("Turn two text.");
    await settle();
    const statusMidTurn = harness.run.getStatusSnapshot().status;
    fake.result([]);
    await settle();

    expect(lifecycleNotices(harness.observed)).toEqual([]);
    expect(deliveredText(harness.observed)).toEqual([
      "I'll wait for the readiness notification.",
      "Background task finished; checking.",
      "Turn two text.",
    ]);
    expect(statusMidTurn).toBe("running");
    expect(harness.recordedAssistantText()).toEqual([
      "I'll wait for the readiness notification.",
      "Background task finished; checking.",
      "Turn two text.",
    ]);
  });
});
