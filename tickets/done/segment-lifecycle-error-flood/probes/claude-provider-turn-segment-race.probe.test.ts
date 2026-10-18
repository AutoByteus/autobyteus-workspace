/**
 * Investigation probe (segment-lifecycle-error-flood): real ClaudeSession on a scripted SDK
 * stream -> real ClaudeAgentRunBackend -> real AgentRun pipeline. Replays the user's shape:
 * an input turn starts a background task and completes; the task completes; the CLI runs a
 * task-notification turn without model output and then starts another turn on its own.
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
import { AgentSegmentLifecycleState } from "../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
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

const summary = (events: AgentRunEvent[]) => events
  .filter((e) => e.eventType !== AgentRunEventType.AGENT_INPUT_STATE && e.eventType !== AgentRunEventType.TOKEN_USAGE_UPDATED && e.eventType !== AgentRunEventType.AGENT_STATUS)
  .map((e) => `${e.eventType}:${String(e.payload.turn_id ?? e.payload.turnId ?? "").slice(-8)}${e.eventType === AgentRunEventType.ERROR ? `:${String(e.payload.code)}` : ""}${e.eventType === AgentRunEventType.SEGMENT_CONTENT ? `:${String(e.payload.delta)}` : ""}`);

describe("probe: Claude provider-initiated turn race", () => {
  it("two provider turns back to back after a background-task completion", async () => {
    const proto = AgentSegmentLifecycleState.prototype as any;
    const origOpen = proto.openTurn; const origBefore = proto.reconcileBeforeBatch;
    proto.openTurn = function (turnId: string) { const before = this.activeTurnId; origOpen.call(this, turnId); console.log(`openTurn(${turnId.slice(-8)}) active ${String(before).slice(-8)} -> ${String(this.activeTurnId).slice(-8)} retired=[${[...this.retiredTurnIds].map((t: string) => t.slice(-8))}]`); };
    proto.reconcileBeforeBatch = function (snap: any) { console.log(`reconcileBeforeBatch snapshot=${JSON.stringify(snap?.currentTurn).slice(0,80)}`); origBefore.call(this, snap); };
    const { sdkClient, run, observed } = harness();
    await run.postUserMessage(new AgentInputUserMessage("start the dev stack in the background"));
    await settle();
    const fake = sdkClient.current;
    fake.init();
    fake.emit(
      { type: "system", subtype: "background_tasks_changed", session_id: SID, tasks: [{ task_id: "bg-1", task_type: "local_bash", description: "Wait for readiness" }] },
      { type: "system", subtype: "task_started", session_id: SID, task_id: "bg-1", description: "Wait for readiness", task_type: "local_bash" },
    );
    fake.assistantText("I'll wait for the readiness notification.");
    fake.result([fake.sent[0]!.uuid]);
    await settle();

    // Background task completes; the CLI runs a task-notification turn with no model output,
    // then starts another turn on its own and works in it.
    fake.emit(
      { type: "system", subtype: "background_tasks_changed", session_id: SID, tasks: [] },
      { type: "system", subtype: "task_notification", session_id: SID, task_id: "bg-1", status: "completed", output_file: "/tmp/bg-1.out", summary: "done" },
    );
    fake.init();
    fake.result([], { origin: { kind: "task-notification" } });
    fake.init();
    fake.assistantText("The stack is ready; continuing the rendered board check.");
    fake.assistantText("Seeding the test Project now.");
    fake.result([]);
    await settle();

    const lines = summary(observed);
    console.log(lines.join("\n"));
    const diagnostics = observed.filter((e) => e.eventType === AgentRunEventType.ERROR && e.payload.code === "AGENT_SEGMENT_LIFECYCLE_INVALID");
    console.log("DIAGNOSTICS", diagnostics.length);
    expect(diagnostics.length).toBeGreaterThanOrEqual(0);
  });
  it("control: the second provider turn arrives after the queue drained", async () => {
    const { sdkClient, run, observed } = harness();
    await run.postUserMessage(new AgentInputUserMessage("start the dev stack in the background"));
    await settle();
    const fake = sdkClient.current;
    fake.init();
    fake.emit(
      { type: "system", subtype: "background_tasks_changed", session_id: SID, tasks: [{ task_id: "bg-1", task_type: "local_bash", description: "Wait for readiness" }] },
      { type: "system", subtype: "task_started", session_id: SID, task_id: "bg-1", description: "Wait for readiness", task_type: "local_bash" },
    );
    fake.assistantText("I'll wait for the readiness notification.");
    fake.result([fake.sent[0]!.uuid]);
    await settle();

    // Background task completes; the CLI runs a task-notification turn with no model output,
    // then starts another turn on its own and works in it.
    fake.emit(
      { type: "system", subtype: "background_tasks_changed", session_id: SID, tasks: [] },
      { type: "system", subtype: "task_notification", session_id: SID, task_id: "bg-1", status: "completed", output_file: "/tmp/bg-1.out", summary: "done" },
    );
    fake.init();
    fake.result([], { origin: { kind: "task-notification" } });
    await settle();
    fake.init();
    fake.assistantText("The stack is ready; continuing the rendered board check.");
    fake.assistantText("Seeding the test Project now.");
    fake.result([]);
    await settle();

    const lines = summary(observed);
    console.log(lines.join("\n"));
    const diagnostics = observed.filter((e) => e.eventType === AgentRunEventType.ERROR && e.payload.code === "AGENT_SEGMENT_LIFECYCLE_INVALID");
    console.log("DIAGNOSTICS", diagnostics.length);
    expect(diagnostics.length).toBeGreaterThanOrEqual(0);
  });
  it("status during the second provider turn", async () => {
    const { sdkClient, run, observed } = harness();
    await run.postUserMessage(new AgentInputUserMessage("start"));
    await settle();
    const fake = sdkClient.current;
    fake.init();
    fake.emit(
      { type: "system", subtype: "background_tasks_changed", session_id: SID, tasks: [{ task_id: "bg-1", task_type: "local_bash", description: "Wait" }] },
      { type: "system", subtype: "task_started", session_id: SID, task_id: "bg-1", description: "Wait", task_type: "local_bash" },
    );
    fake.assistantText("waiting");
    fake.result([fake.sent[0]!.uuid]);
    await settle();
    fake.emit(
      { type: "system", subtype: "background_tasks_changed", session_id: SID, tasks: [] },
      { type: "system", subtype: "task_notification", session_id: SID, task_id: "bg-1", status: "completed", output_file: "/tmp/o", summary: "done" },
    );
    fake.init();
    fake.result([], { origin: { kind: "task-notification" } });
    fake.init();
    fake.assistantText("working in turn two");
    await settle();
    console.log("STATUS-MID-T2", JSON.stringify(run.getStatusSnapshot()));
    console.log("STATUS-EVENTS", observed.filter((e) => e.eventType === AgentRunEventType.AGENT_STATUS).map((e) => e.payload.status).join(","));
    fake.assistantText("still working");
    await settle();
    console.log("STATUS-MID-T2b", JSON.stringify(run.getStatusSnapshot()));
  });
});
