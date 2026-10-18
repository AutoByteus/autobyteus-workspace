/**
 * Experiment probe (segment-lifecycle-error-flood). Scores a candidate design against:
 *  X1 Claude burst: two provider turns back to back -> no lifecycle diagnostics, turn-2 text delivered.
 *  X2 Claude burst: AgentRun status is running while turn 2 is still working, idle after it.
 *  X3 genuine late segment events of an ended turn are still rejected (not displayed).
 *  X4 control: same frames with the queue drained between turns.
 * Real ClaudeSession (scripted SDK) -> real ClaudeAgentRunBackend -> real AgentRun.
 */
import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import { buildClaudeSessionConfig } from "../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSession } from "../../../src/agent-execution/backends/claude/session/claude-session.js";
import { ClaudeProviderSessionLifecycle } from "../../../src/agent-execution/backends/claude/session/claude-provider-session-lifecycle.js";
import { ClaudeSessionMessageCache } from "../../../src/agent-execution/backends/claude/session/claude-session-message-cache.js";
import { ClaudeSessionToolUseCoordinator } from "../../../src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.js";
import { ClaudeAgentRunBackend } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { createFakeClaudeSdkClient, flushClaudeSession } from "../../helpers/fake-claude-streaming-sdk.js";

const SID = "11111111-1111-4111-8111-111111111111";

const harness = () => {
  const sdkClient = createFakeClaudeSdkClient({ providerSessionId: SID });
  let sessionRef: ClaudeSession | null = null;
  const toolingCoordinator = new ClaudeSessionToolUseCoordinator(new Map(), new Map(),
    (_ctx, event) => sessionRef?.emitRuntimeEvent(event));
  const runContext = new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({ agentDefinitionId: "a", llmModelIdentifier: "haiku", autoExecuteTools: true,
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
      agentToolMcpRunSessions: { activateForRun: vi.fn() } as never, systemInstructionCaptureService: undefined,
      isRunSessionActive: () => true, terminateRunSession: vi.fn(async () => undefined),
    },
  });
  sessionRef = session;
  const backend = new ClaudeAgentRunBackend(runContext as never, session);
  const run = new AgentRun({ providerInputNormalizer: { normalizeForProvider: (d) => d }, context: runContext as never, backend });
  const observed: AgentRunEvent[] = [];
  run.subscribeToEvents((event) => observed.push(event));
  return { sdkClient, session, run, observed };
};

const settle = async () => { for (let i = 0; i < 20; i += 1) { await flushClaudeSession(); await new Promise((r) => setTimeout(r, 1)); } };
const diagnostics = (events: AgentRunEvent[]) => events.filter((e) => e.eventType === AgentRunEventType.ERROR && e.payload.code === "AGENT_SEGMENT_LIFECYCLE_INVALID");
const texts = (events: AgentRunEvent[]) => events.filter((e) => e.eventType === AgentRunEventType.SEGMENT_CONTENT).map((e) => String(e.payload.delta));

const startWithBackgroundTask = async (h: ReturnType<typeof harness>) => {
  await h.run.postUserMessage(new AgentInputUserMessage("start the dev stack in the background"));
  await settle();
  const fake = h.sdkClient.current;
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

describe("turn race experiment", () => {
  it("X1+X2: two provider turns in one burst keep turn-2 text and running status", async () => {
    const h = harness();
    const fake = await startWithBackgroundTask(h);
    fake.init();
    fake.result([], { origin: { kind: "task-notification" } });
    fake.init();
    fake.assistantText("The stack is ready.");
    await settle();
    const statusMid = h.run.getStatusSnapshot().status;
    fake.assistantText("Seeding the test Project now.");
    fake.result([]);
    await settle();
    const statusEnd = h.run.getStatusSnapshot().status;
    console.log(`X1 diagnostics=${diagnostics(h.observed).length} texts=${JSON.stringify(texts(h.observed))}`);
    console.log(`X2 statusMid=${statusMid} statusEnd=${statusEnd}`);
    expect({ diagnostics: diagnostics(h.observed).length, texts: texts(h.observed), statusMid, statusEnd }).toEqual({
      diagnostics: 0,
      texts: ["I'll wait for the readiness notification.", "The stack is ready.", "Seeding the test Project now."],
      statusMid: "running",
      statusEnd: "idle",
    });
  });

  it("X3: late segment events of an ended turn stay rejected", async () => {
    const h = harness();
    await h.run.postUserMessage(new AgentInputUserMessage("hi"));
    await settle();
    const fake = h.sdkClient.current;
    fake.completeTurn("hello");
    await settle();
    const ended = h.observed.find((e) => e.eventType === AgentRunEventType.TURN_COMPLETED)!;
    const turnId = String(ended.payload.turn_id ?? ended.payload.turnId);
    const before = texts(h.observed).length;
    // Inject a late text segment for the ended turn straight through the session's runtime-event channel.
    h.session.emitRuntimeEvent({ method: "item/added", params: { id: "late-1", turn_id: turnId, segment_type: "text" } });
    h.session.emitRuntimeEvent({ method: "item/outputText/delta", params: { id: "late-1", turn_id: turnId, delta: "late" } });
    await settle();
    console.log(`X3 lateTextsDelivered=${texts(h.observed).length - before} diagnostics=${diagnostics(h.observed).length}`);
    expect(texts(h.observed).length - before).toBe(0);
  });

  it("X4 control: queue drained between the turns", async () => {
    const h = harness();
    const fake = await startWithBackgroundTask(h);
    fake.init();
    fake.result([], { origin: { kind: "task-notification" } });
    await settle();
    fake.init();
    fake.assistantText("The stack is ready.");
    fake.result([]);
    await settle();
    console.log(`X4 diagnostics=${diagnostics(h.observed).length}`);
    expect(diagnostics(h.observed).length).toBe(0);
  });
  it("X5: first provider turn has text still queued when the runtime moves to turn 2", async () => {
    const h = harness();
    const fake = await startWithBackgroundTask(h);
    fake.init();
    fake.assistantText("Background task finished; checking.");
    fake.result([], { origin: { kind: "task-notification" } });
    fake.init();
    fake.assistantText("Turn two text.");
    await settle();
    const statusMid = h.run.getStatusSnapshot().status;
    fake.result([]);
    await settle();
    console.log(`X5 diagnostics=${diagnostics(h.observed).length} texts=${JSON.stringify(texts(h.observed))} statusMid=${statusMid}`);
    expect({ d: diagnostics(h.observed).length, t: texts(h.observed), statusMid }).toEqual({
      d: 0, t: ["I'll wait for the readiness notification.", "Background task finished; checking.", "Turn two text."], statusMid: "running" });
  });

  it("X6: input turn follows a provider turn in the same burst (user message joins/queues)", async () => {
    const h = harness();
    const fake = await startWithBackgroundTask(h);
    fake.init();
    fake.result([], { origin: { kind: "task-notification" } });
    fake.init();
    fake.assistantText("Provider turn text.");
    fake.result([]);
    await h.run.postUserMessage(new AgentInputUserMessage("next please"));
    await settle();
    fake.completeTurn("Answer to next.", [fake.sent.at(-1)!.uuid]);
    await settle();
    console.log(`X6 diagnostics=${diagnostics(h.observed).length} texts=${JSON.stringify(texts(h.observed))} status=${h.run.getStatusSnapshot().status}`);
    expect(diagnostics(h.observed).length).toBe(0);
    expect(texts(h.observed)).toContain("Answer to next.");
    expect(texts(h.observed)).toContain("Provider turn text.");
  });
});
