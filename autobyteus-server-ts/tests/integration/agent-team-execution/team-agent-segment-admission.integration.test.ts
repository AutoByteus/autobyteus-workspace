import { describe, expect, it } from "vitest";
import { StreamEventType } from "autobyteus-ts";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type {
  AgentRunBackend,
  AgentRunSourceEventBatchListener,
} from "../../../src/agent-execution/backends/agent-run-backend.js";
import { AutoByteusStreamEventConverter } from "../../../src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.js";
import { ClaudeSessionEventConverter } from "../../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { ClaudeSessionEventName } from "../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../src/agent-execution/domain/agent-runtime-lifecycle-snapshot.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { TeamRunEventSourceType } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { TeamAgentEventAdapter } from "../../../src/agent-team-execution/services/team-agent-event-adapter.js";
import { ApplicationAgentStreamEventProjector } from "../../../src/application-agent-streaming/services/application-agent-stream-event-projector.js";
import {
  parseDirectChannelOutputEvent,
  parseTeamChannelOutputEvent,
} from "../../../src/external-channel/runtime/channel-output-event-parser.js";
import { ChannelRunOutputEventCollector } from "../../../src/external-channel/runtime/channel-run-output-event-collector.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunEventMessageMapper } from "../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { projectTeamAgentEventMessage } from "../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";

const runId = "teacher-agent-run";
const executionAddress = createTeamExecutionAddress({
  rootTeamRunId: "root-team-run",
  taskTeamRunIds: [],
  memberAddress: "/Teacher",
  taskAgentRunId: null,
});
const execution = createTeamAgentExecutionBinding({
  executionAddress,
  agentRunId: runId,
});

const runningSnapshot = (turnId: string): AgentRuntimeLifecycleSnapshot => ({
  availability: "active",
  phase: "running",
  currentTurn: { kind: "IDENTIFIED", turnId },
});

class SegmentSourceBackend implements AgentRunBackend {
  readonly runtimeKind = RuntimeKind.AUTOBYTEUS;
  readonly context = new AgentRunContext({
    runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      agentDefinitionId: "teacher-agent-definition",
      llmModelIdentifier: "test-model",
      autoExecuteTools: true,
      workspaceId: null,
      memoryDir: null,
      llmConfig: null,
      skillAccessMode: SkillAccessMode.NONE,
    }),
    runtimeContext: null,
  });
  private snapshot = runningSnapshot("turn-1");
  private readonly listeners = new Set<AgentRunSourceEventBatchListener>();

  getContext(): AgentRunContext<null> {
    return this.context;
  }

  isActive(): boolean {
    return true;
  }

  getPlatformAgentRunId(): string | null {
    return "platform-teacher-run";
  }

  getLifecycleSnapshot(): AgentRuntimeLifecycleSnapshot {
    return this.snapshot;
  }

  subscribeToSourceEventBatches(listener: AgentRunSourceEventBatchListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async postUserMessage(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  async approveToolInvocation(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  async interrupt(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  async terminate(): Promise<{ accepted: true }> {
    return { accepted: true };
  }

  setTurn(turnId: string): void {
    this.snapshot = runningSnapshot(turnId);
  }

  async emit(events: readonly AgentRunEvent[]): Promise<void> {
    for (const listener of this.listeners) {
      await listener(events);
    }
  }
}

const sourceEvent = (
  eventType: AgentRunEventType,
  payload: Record<string, unknown>,
): AgentRunEvent => ({ runId, eventType, payload, statusHint: null });

const createRunHarness = () => {
  const backend = new SegmentSourceBackend();
  const run = new AgentRun({ context: backend.context, backend });
  const observed: AgentRunEvent[] = [];
  run.subscribeToEvents((event) => observed.push(event));
  return { backend, run, observed };
};

const segmentEvents = (events: readonly AgentRunEvent[]): AgentRunEvent[] =>
  events.filter((event) =>
    event.eventType === AgentRunEventType.SEGMENT_START ||
    event.eventType === AgentRunEventType.SEGMENT_CONTENT ||
    event.eventType === AgentRunEventType.SEGMENT_END
  );

const diagnosticEvents = (events: readonly AgentRunEvent[]): AgentRunEvent[] =>
  events.filter((event) =>
    event.eventType === AgentRunEventType.ERROR &&
    event.payload.code === "AGENT_SEGMENT_LIFECYCLE_INVALID"
  );

describe("AgentRun-owned Team segment lifecycle", () => {
  it("correlates a real AutoByteus native sequence before Team, standalone, and application projection", async () => {
    const { backend, observed } = createRunHarness();
    const converter = new AutoByteusStreamEventConverter(runId);
    const converted = [
      converter.convert({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: "SEGMENT_START",
          segment_id: "segment-1",
          segment_type: "text",
          turn_id: "turn-1",
          payload: { metadata: { role: "assistant" } },
        },
      } as any),
      converter.convert({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: "SEGMENT_CONTENT",
          segment_id: "segment-1",
          turn_id: "turn-1",
          payload: { delta: "visible content" },
        },
      } as any),
      converter.convert({
        event_type: StreamEventType.SEGMENT_EVENT,
        data: {
          event_type: "SEGMENT_END",
          segment_id: "segment-1",
          turn_id: "turn-1",
          payload: { metadata: { completed: true } },
        },
      } as any),
    ];

    expect(converted.every((event): event is AgentRunEvent => event !== null)).toBe(true);
    expect(converted[1]?.payload).toEqual({
      id: "segment-1",
      turn_id: "turn-1",
      delta: "visible content",
    });
    expect(converted[2]?.payload).not.toHaveProperty("segment_type");

    await backend.emit(converted as AgentRunEvent[]);

    const canonical = segmentEvents(observed);
    expect(canonical).toEqual([
      sourceEvent(AgentRunEventType.SEGMENT_START, {
        id: "segment-1",
        turn_id: "turn-1",
        segment_type: "text",
        metadata: { role: "assistant" },
      }),
      sourceEvent(AgentRunEventType.SEGMENT_CONTENT, {
        id: "segment-1",
        turn_id: "turn-1",
        segment_type: "text",
        delta: "visible content",
      }),
      sourceEvent(AgentRunEventType.SEGMENT_END, {
        id: "segment-1",
        turn_id: "turn-1",
        metadata: { completed: true },
      }),
    ]);

    const adapter = new TeamAgentEventAdapter(() => executionAddress);
    const admitted = canonical.map((event) => adapter.adapt(event));
    expect(admitted.every((result) => result.kind === "publish")).toBe(true);
    const teamEvents = admitted.map((result) => {
      if (result.kind !== "publish") throw new Error(`Unexpected result: ${JSON.stringify(result)}`);
      return result.event;
    });
    expect(teamEvents.map((event) => event.details)).toEqual([
      {
        segmentId: "segment-1",
        turnId: "turn-1",
        segmentType: "text",
        metadata: { role: "assistant" },
      },
      {
        segmentId: "segment-1",
        turnId: "turn-1",
        segmentType: "text",
        delta: "visible content",
      },
      {
        segmentId: "segment-1",
        turnId: "turn-1",
        metadata: { completed: true },
        interrupted: false,
        reason: null,
        failed: false,
        error: null,
      },
    ]);

    const teamWire = teamEvents.map((event) => projectTeamAgentEventMessage(execution, event));
    expect(teamWire.map((message) => message.payload)).toEqual([
      expect.objectContaining({ segment_id: "segment-1", turn_id: "turn-1", segment_type: "text" }),
      expect.objectContaining({ segment_id: "segment-1", turn_id: "turn-1", segment_type: "text", delta: "visible content" }),
      expect.objectContaining({ segment_id: "segment-1", turn_id: "turn-1" }),
    ]);

    const standalone = JSON.parse(
      new AgentRunEventMessageMapper().map(canonical[1]!).toJson(),
    ) as { type: string; payload: Record<string, unknown> };
    expect(standalone).toEqual({
      type: "SEGMENT_CONTENT",
      payload: {
        id: "segment-1",
        turn_id: "turn-1",
        segment_type: "text",
        delta: "visible content",
      },
    });

    const application = new ApplicationAgentStreamEventProjector();
    expect(application.project(canonical[1]!)).toEqual({
      type: "TEXT_DELTA",
      delta: "visible content",
    });
    expect(application.projectTeam(teamEvents[1]!)).toEqual({
      type: "TEXT_DELTA",
      delta: "visible content",
    });
  });

  it("preserves exact Claude delta bytes once through direct and nested Team external collection", async () => {
    const { backend, observed } = createRunHarness();
    const converter = new ClaudeSessionEventConverter(runId);
    const deltas = [" hello ", " ", "\n", "foo\n", "x", "x", "ab", "bc"];
    const expected = " hello  \nfoo\nxxabbc";
    const converted = [
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_ADDED,
        params: {
          id: "claude-text-1",
          turn_id: "turn-1",
          segment_type: "text",
        },
      }),
      ...deltas.flatMap((delta) => converter.convert({
        method: ClaudeSessionEventName.ITEM_OUTPUT_TEXT_DELTA,
        params: { id: "claude-text-1", turn_id: "turn-1", delta },
      })),
      ...converter.convert({
        method: ClaudeSessionEventName.ITEM_OUTPUT_TEXT_COMPLETED,
        params: { id: "claude-text-1", turn_id: "turn-1" },
      }),
      ...converter.convert({
        method: ClaudeSessionEventName.TURN_COMPLETED,
        params: { turnId: "turn-1" },
      }),
    ];

    await backend.emit(converted);

    const directCollector = new ChannelRunOutputEventCollector();
    const directFinal = observed.reduce<ReturnType<ChannelRunOutputEventCollector["processEvent"]>>(
      (final, event) => {
        const parsed = parseDirectChannelOutputEvent(event);
        if (!parsed) return final;
        return directCollector.processEvent({ deliveryKey: "direct-delivery", event: parsed }) ?? final;
      },
      null,
    );

    const nestedExecutionAddress = createTeamExecutionAddress({
      rootTeamRunId: "root-team-run",
      taskTeamRunIds: ["outer-task-team-run", "inner-task-team-run"],
      memberAddress: "/StudentStudyGroup/student_one",
      taskAgentRunId: null,
    });
    const nestedAdapter = new TeamAgentEventAdapter(() => nestedExecutionAddress);
    const nestedExecution = createTeamAgentExecutionBinding({
      executionAddress: nestedExecutionAddress,
      agentRunId: runId,
    });
    const teamCollector = new ChannelRunOutputEventCollector();
    const teamFinal = observed.reduce<ReturnType<ChannelRunOutputEventCollector["processEvent"]>>(
      (final, event) => {
        const adapted = nestedAdapter.adapt(event);
        if (adapted.kind !== "publish") return final;
        const parsed = parseTeamChannelOutputEvent({
          eventSourceType: TeamRunEventSourceType.AGENT,
          execution: nestedExecution,
          payload: adapted.event,
        });
        if (!parsed) return final;
        return teamCollector.processEvent({ deliveryKey: "team-delivery", event: parsed }) ?? final;
      },
      null,
    );

    expect(segmentEvents(observed).filter((event) =>
      event.eventType === AgentRunEventType.SEGMENT_CONTENT
    ).map((event) => event.payload.delta)).toEqual(deltas);
    expect(directFinal).toEqual({
      deliveryKey: "direct-delivery",
      turnId: "turn-1",
      replyText: expected,
    });
    expect(teamFinal).toEqual({
      deliveryKey: "team-delivery",
      turnId: "turn-1",
      replyText: expected,
    });
  });

  it("emits a diagnostic for missing identity and accepts a later valid sequence without generated identity", async () => {
    const { backend, observed } = createRunHarness();
    await backend.emit([
      sourceEvent(AgentRunEventType.SEGMENT_START, {
        id: null,
        turn_id: "turn-1",
        segment_type: "text",
      }),
    ]);

    expect(diagnosticEvents(observed)).toHaveLength(1);
    expect(JSON.stringify(observed)).not.toContain("runtime-segment");

    await backend.emit([
      sourceEvent(AgentRunEventType.SEGMENT_START, {
        id: "segment-recovered",
        turn_id: "turn-1",
        segment_type: "text",
      }),
      sourceEvent(AgentRunEventType.SEGMENT_CONTENT, {
        id: "segment-recovered",
        turn_id: "turn-1",
        delta: "recovered",
      }),
    ]);

    expect(segmentEvents(observed).map((event) => event.payload)).toEqual([
      { id: "segment-recovered", turn_id: "turn-1", segment_type: "text" },
      {
        id: "segment-recovered",
        turn_id: "turn-1",
        segment_type: "text",
        delta: "recovered",
      },
    ]);
  });

  it("rejects content before start, then correlates the same exact identity after start", async () => {
    const { backend, observed } = createRunHarness();
    await backend.emit([
      sourceEvent(AgentRunEventType.SEGMENT_CONTENT, {
        id: "segment-late",
        turn_id: "turn-1",
        delta: "too early",
      }),
      sourceEvent(AgentRunEventType.SEGMENT_START, {
        id: "segment-late",
        turn_id: "turn-1",
        segment_type: "reasoning",
      }),
      sourceEvent(AgentRunEventType.SEGMENT_CONTENT, {
        id: "segment-late",
        turn_id: "turn-1",
        delta: "accepted later",
      }),
    ]);

    expect(diagnosticEvents(observed)).toHaveLength(1);
    expect(segmentEvents(observed).map((event) => event.payload)).toEqual([
      { id: "segment-late", turn_id: "turn-1", segment_type: "reasoning" },
      {
        id: "segment-late",
        turn_id: "turn-1",
        segment_type: "reasoning",
        delta: "accepted later",
      },
    ]);
  });

  it("rejects conflicting type and preserves the original exact segment lifecycle", async () => {
    const { backend, observed } = createRunHarness();
    await backend.emit([
      sourceEvent(AgentRunEventType.SEGMENT_START, {
        id: "segment-shared",
        turn_id: "turn-1",
        segment_type: "reasoning",
      }),
      sourceEvent(AgentRunEventType.SEGMENT_START, {
        id: "segment-shared",
        turn_id: "turn-1",
        segment_type: "tool_call",
      }),
      sourceEvent(AgentRunEventType.SEGMENT_CONTENT, {
        id: "segment-shared",
        turn_id: "turn-1",
        delta: "still reasoning",
      }),
    ]);

    expect(diagnosticEvents(observed)).toHaveLength(1);
    expect(segmentEvents(observed).map((event) => event.payload)).toEqual([
      { id: "segment-shared", turn_id: "turn-1", segment_type: "reasoning" },
      {
        id: "segment-shared",
        turn_id: "turn-1",
        segment_type: "reasoning",
        delta: "still reasoning",
      },
    ]);
  });

  it("suppresses exact start/end replays and rejects content after terminal end", async () => {
    const { backend, observed } = createRunHarness();
    const start = sourceEvent(AgentRunEventType.SEGMENT_START, {
      id: "segment-terminal",
      turn_id: "turn-1",
      segment_type: "text",
    });
    const end = sourceEvent(AgentRunEventType.SEGMENT_END, {
      id: "segment-terminal",
      turn_id: "turn-1",
    });
    await backend.emit([
      start,
      start,
      end,
      end,
      sourceEvent(AgentRunEventType.SEGMENT_CONTENT, {
        id: "segment-terminal",
        turn_id: "turn-1",
        delta: "after end",
      }),
    ]);

    expect(segmentEvents(observed).map((event) => event.eventType)).toEqual([
      AgentRunEventType.SEGMENT_START,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(diagnosticEvents(observed)).toHaveLength(1);
  });

  it("rejects source content carrying a surplus type instead of treating canonical output as source input", async () => {
    const { backend, observed } = createRunHarness();
    await backend.emit([
      sourceEvent(AgentRunEventType.SEGMENT_START, {
        id: "segment-surplus",
        turn_id: "turn-1",
        segment_type: "text",
      }),
      sourceEvent(AgentRunEventType.SEGMENT_CONTENT, {
        id: "segment-surplus",
        turn_id: "turn-1",
        segment_type: "text",
        delta: "source must not repeat type",
      }),
    ]);

    expect(segmentEvents(observed)).toHaveLength(1);
    expect(diagnosticEvents(observed)).toHaveLength(1);
  });

  it("retires an ended turn and accepts a fresh exact segment on the next run-owned turn", async () => {
    const { backend, observed } = createRunHarness();
    await backend.emit([
      sourceEvent(AgentRunEventType.SEGMENT_START, {
        id: "segment-turn-1",
        turn_id: "turn-1",
        segment_type: "text",
      }),
      sourceEvent(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-1" }),
      sourceEvent(AgentRunEventType.SEGMENT_CONTENT, {
        id: "segment-turn-1",
        turn_id: "turn-1",
        delta: "retired",
      }),
    ]);

    backend.setTurn("turn-2");
    await backend.emit([
      sourceEvent(AgentRunEventType.TURN_STARTED, { turn_id: "turn-2" }),
      sourceEvent(AgentRunEventType.SEGMENT_START, {
        id: "segment-turn-2",
        turn_id: "turn-2",
        segment_type: "text",
      }),
      sourceEvent(AgentRunEventType.SEGMENT_CONTENT, {
        id: "segment-turn-2",
        turn_id: "turn-2",
        delta: "fresh",
      }),
    ]);

    expect(diagnosticEvents(observed)).toHaveLength(1);
    expect(segmentEvents(observed).at(-1)?.payload).toEqual({
      id: "segment-turn-2",
      turn_id: "turn-2",
      segment_type: "text",
      delta: "fresh",
    });
  });

  it.each([
    ["snake_case", { segment_id: "alias-only" }],
    ["camelCase", { segmentId: "alias-only" }],
  ])("rejects an internal %s alias without canonical id", (_label, aliasPayload) => {
    const internalEvent = sourceEvent(AgentRunEventType.SEGMENT_CONTENT, {
      ...aliasPayload,
      segment_type: "text",
      turn_id: "turn-1",
      delta: "must reject",
    });

    expect(new TeamAgentEventAdapter(() => executionAddress).adapt(internalEvent)).toEqual({
      kind: "rejected",
      code: "TEAM_AGENT_EVENT_ADMISSION_FAILED",
      message: "Rejected SEGMENT_CONTENT: segment payload contains unsupported fields",
    });
  });
});
