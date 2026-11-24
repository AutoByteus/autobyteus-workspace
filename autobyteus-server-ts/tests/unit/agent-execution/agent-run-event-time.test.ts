// autobyteus-628 D-3 (REQ-004, AC-006): the server records every time; the app only shows it. The run stamps each event
// it delivers once (the processed events, the input state, the canonical status, the subscribe snapshot); every timed
// message on the three streams (`/ws/agent`, `/ws/agent-team`, the Org presentation) carries that time as `occurred_at`;
// an input entry carries `accepted_at`. Production: AgentRun, AgentRunEventMessageMapper, TeamAgentEventAdapter +
// projectTeamAgentEventMessage, AgentRunPresentationAdapter + projectAgentPresentationMessage. The backend is a double.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { SKILL_UPDATE_NOTICE_SENDER_ID } from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { RuntimeMemoryEventAccumulator } from "../../../src/agent-memory/services/runtime-memory-event-accumulator.js";
import { ExternalRuntimeMemoryWriter } from "../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../src/agent-execution/domain/agent-runtime-lifecycle-snapshot.js";
import { AgentRunEventMessageMapper } from "../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { TeamAgentEventAdapter } from "../../../src/agent-team-execution/services/team-agent-event-adapter.js";
import { projectTeamAgentEventMessage } from "../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";
import { createAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunPresentationAdapter } from "../../../src/agent-collaboration/execution/events/collaboration-agent-presentation-adapter.js";
import { projectAgentPresentationMessage } from "../../../src/agent-collaboration/execution/events/agent-presentation-message-projector.js";

const RUN = "agent-run-628";
const running: AgentRuntimeLifecycleSnapshot = { availability: "active", phase: "running", currentTurn: { kind: "IDENTIFIED", turnId: "turn-1" } };
const event = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent => ({ eventType, runId: RUN, payload, statusHint: null });

/** The events of a live turn, as a runtime's backend emits them (no time yet). All are stamped on delivery; all but
 * SEGMENT_END carry `occurred_at` on the wire (their readers create or time a row). */
const TIMED_SOURCE_EVENTS: AgentRunEvent[] = [
  event(AgentRunEventType.SYSTEM_TASK_NOTIFICATION, { sender_id: "system.skill_update_notifier", content: "[Platform notice — skill updated]", message_id: "n1", turn_id: "turn-1" }),
  event(AgentRunEventType.SEGMENT_START, { id: "s1", turn_id: "turn-1", segment_type: "text" }),
  event(AgentRunEventType.SEGMENT_CONTENT, { id: "s1", turn_id: "turn-1", delta: "My recommendation stands." }),
  event(AgentRunEventType.SEGMENT_END, { id: "s1", turn_id: "turn-1" }),
  event(AgentRunEventType.TOOL_EXECUTION_STARTED, { invocation_id: "call-1", tool_name: "run_bash", turn_id: "turn-1", arguments: { command: "ls" } }),
  event(AgentRunEventType.TOOL_LOG, { log_entry: "a.txt", tool_invocation_id: "call-1", tool_name: "run_bash", turn_id: "turn-1" }),
  event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, { invocation_id: "call-1", tool_name: "run_bash", turn_id: "turn-1", arguments: { command: "ls" }, result: "a.txt" }),
  event(AgentRunEventType.COMPACTION_STATUS, { phase: "completed", kind: "context_compaction", status: "completed", turn_id: "turn-1", provider_timestamp: 1 }),
  event(AgentRunEventType.ERROR, { code: "PROVIDER_ERROR", message: "rate limited" }),
];

const createRun = () => {
  const context = new AgentRunContext({ runId: RUN, config: new AgentRunConfig({ runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, agentDefinitionId: "def",
    llmModelIdentifier: "m", autoExecuteTools: false, workspaceId: null, llmConfig: null }), runtimeContext: null });
  let source: ((events: readonly AgentRunEvent[]) => void | Promise<void>) | null = null;
  const backend = {
    runId: RUN, runtimeKind: context.config.runtimeKind, compactionRecovery: { kind: "unsupported" } as const,
    inputCapabilities: { activeTurnAppend: "unsupported" }, getContext: () => context, getPlatformAgentRunId: () => "p",
    isActive: () => true, getLifecycleSnapshot: () => running,
    backgroundTaskInspection: { kind: "event-stream" as const, current: vi.fn(() => []) },
    subscribeToSourceEventBatches: (next: (events: readonly AgentRunEvent[]) => void | Promise<void>) => { source = next; return () => { source = null; }; },
    dispatchUserInput: vi.fn().mockResolvedValue({ forwarded: true, turnId: null }),
    approveToolInvocation: vi.fn(), interrupt: vi.fn(), terminate: vi.fn(),
  };
  const run = new AgentRun({ providerInputNormalizer: { normalizeForProvider: (dispatch: never) => dispatch }, context, backend: backend as never, commandObservers: [] });
  return { run, emit: async (events: AgentRunEvent[]) => { await source?.(events); } };
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the run's one time for each event it delivers (autobyteus-628 D-3)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("stamps every delivery once: the subscribe snapshot, the processed events, the input state and the status; each listener reads the same time", async () => {
    const { run, emit } = createRun();
    const first: AgentRunEvent[] = [];
    const second: AgentRunEvent[] = [];
    run.subscribeToEvents((item) => first.push(item));
    run.subscribeToEvents((item) => second.push(item));
    await settle();
    const before = Date.now();
    await run.postUserMessage(new AgentInputUserMessage("You mean …?"));
    await emit(TIMED_SOURCE_EVENTS);
    await settle();
    const after = Date.now();

    expect(first.length).toBeGreaterThan(TIMED_SOURCE_EVENTS.length);
    expect(first.every((item) => typeof item.occurredAt === "number")).toBe(true);
    for (const type of [AgentRunEventType.AGENT_INPUT_STATE, AgentRunEventType.AGENT_STATUS, ...TIMED_SOURCE_EVENTS.map((item) => item.eventType)]) {
      expect(first.some((item) => item.eventType === type), type).toBe(true);
    }
    // The second listener got each event the first got after it subscribed, with the same time.
    const timesOf = (items: AgentRunEvent[]) => items.filter((item) => TIMED_SOURCE_EVENTS.some((source) => source.eventType === item.eventType)).map((item) => item.occurredAt);
    expect(timesOf(second)).toEqual(timesOf(first));
    for (const item of first.filter((entry) => TIMED_SOURCE_EVENTS.some((source) => source.eventType === entry.eventType))) {
      expect(item.occurredAt).toBeGreaterThanOrEqual(before);
      expect(item.occurredAt).toBeLessThanOrEqual(after);
    }
    // The input the node admitted carries its acceptance time.
    const inputState = first.filter((item) => item.eventType === AgentRunEventType.AGENT_INPUT_STATE).at(-1)!;
    const entries = (inputState.payload as { entries: Array<{ accepted_at: string }> }).entries;
    expect(entries.length).toBeGreaterThan(0);
    expect(Date.parse(entries[0]!.accepted_at)).toBeGreaterThanOrEqual(before - 1_000);
  });

  it("an event already stamped keeps its time", async () => {
    const { run, emit } = createRun();
    const seen: AgentRunEvent[] = [];
    run.subscribeToEvents((item) => seen.push(item));
    await settle();
    await emit([{ ...event(AgentRunEventType.SEGMENT_START, { id: "s1", turn_id: "turn-1", segment_type: "text" }), occurredAt: 1795452909697 }]);
    await settle();
    expect(seen.find((item) => item.eventType === AgentRunEventType.SEGMENT_START)?.occurredAt).toBe(1795452909697);
  });

  it("every timed message on /ws/agent, the Team stream and the Org presentation carries the run's time as occurred_at", async () => {
    const { run, emit } = createRun();
    const delivered: AgentRunEvent[] = [];
    run.subscribeToEvents((item) => delivered.push(item));
    await settle();
    await emit(TIMED_SOURCE_EVENTS);
    await settle();
    const timed = delivered.filter((item) => item.eventType !== AgentRunEventType.SEGMENT_END
      && TIMED_SOURCE_EVENTS.some((source) => source.eventType === item.eventType));
    expect(timed.map((item) => item.eventType)).toEqual(TIMED_SOURCE_EVENTS.map((item) => item.eventType).filter((type) => type !== AgentRunEventType.SEGMENT_END));

    const execution = createTeamAgentExecutionBinding({ root: createTeamRootExecutionIdentity("team-628"), memberAddress: createAgentTeamAddress(["lead"]), agentRunId: RUN });
    const team = new TeamAgentEventAdapter(() => execution);
    const org = new AgentRunPresentationAdapter(() => execution);
    const mapper = new AgentRunEventMessageMapper();
    for (const [index, item] of timed.entries()) {
      const time = new Date(item.occurredAt!).toISOString();
      expect(mapper.map(item).payload.occurred_at, `/ws/agent ${item.eventType}`).toBe(time);
      const teamEvent = team.adapt(item);
      if (teamEvent.kind !== "publish") throw new Error(`Team refused ${item.eventType}: ${JSON.stringify(teamEvent)}`);
      expect((projectTeamAgentEventMessage(execution, teamEvent.event, index + 1).payload as { occurred_at?: string }).occurred_at, `Team ${item.eventType}`).toBe(time);
      const orgEvent = org.adapt(item);
      if (orgEvent.kind !== "publish") throw new Error(`Org refused ${item.eventType}`);
      expect((projectAgentPresentationMessage(orgEvent.event).payload as { occurred_at?: string }).occurred_at, `Org ${item.eventType}`).toBe(time);
    }
  });

  it("a timed event that no run delivered is refused, never sent with another clock's time", () => {
    const unstamped = event(AgentRunEventType.SEGMENT_START, { id: "s1", turn_id: "turn-1", segment_type: "text" });
    expect(() => new AgentRunEventMessageMapper().map(unstamped)).toThrow(/no occurredAt/);
    const execution = createTeamAgentExecutionBinding({ root: createTeamRootExecutionIdentity("team-628"), memberAddress: createAgentTeamAddress(["lead"]), agentRunId: RUN });
    expect(new TeamAgentEventAdapter(() => execution).adapt(unstamped)).toMatchObject({ kind: "rejected" });
  });

  // SR-007 (delivery DR-001 Finding 2): the memory recorder does not read occurredAt. Each trace keeps the time it was
  // written, so the stored order is the write order; a trace built from several events never takes an earlier one's time.
  it("the memory recorder stores each trace at its write time, never at the event's delivery time", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-event-time-"));
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const writer = new ExternalRuntimeMemoryWriter({ memoryDir });
      const accumulator = new RuntimeMemoryEventAccumulator({ runId: RUN, writer, toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups() });
      const notice = (occurredAt?: number) => accumulator.recordRunEvent({ ...event(AgentRunEventType.SYSTEM_TASK_NOTIFICATION, {
        sender_id: SKILL_UPDATE_NOTICE_SENDER_ID, content: "[Platform notice — skill updated]", turn_id: "turn-1" }), occurredAt });
      accumulator.recordRunEvent({ ...event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" }), occurredAt: 1795452909000 });
      // Delivered a minute before it is written: stored at its write time.
      vi.setSystemTime(1795452969697);
      notice(1795452909697);
      // Not stamped (a producer outside a run): stored at its write time too, not refused.
      vi.setSystemTime(1795452970001);
      notice(undefined);
      expect(new RunMemoryFileStore(memoryDir).listRawTraceDicts().map((trace) => [trace.trace_type, trace.ts]))
        .toEqual([["system_task_notification", 1795452969.697], ["system_task_notification", 1795452970.001]]);
    } finally {
      vi.useRealTimers();
      await fs.rm(memoryDir, { recursive: true, force: true });
    }
  });
});
