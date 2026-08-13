import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import type { AgentRuntimeLifecycleSnapshot } from "../../../../src/agent-execution/domain/agent-runtime-lifecycle-snapshot.js";
import { AgentRunEventPipeline } from "../../../../src/agent-execution/events/agent-run-event-pipeline.js";
import { AgentTurnLifecycleState } from "../../../../src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.js";
import { LifecycleStatusEventTransformer } from "../../../../src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-transformer.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const activeIdleSnapshot = (): AgentRuntimeLifecycleSnapshot => ({
  availability: "active",
  phase: "idle",
  currentTurn: { kind: "NONE" },
});

const createHarness = (options: {
  snapshot?: AgentRuntimeLifecycleSnapshot;
  deriveEvent?: AgentRunEvent;
} = {}) => {
  const runContext = new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({
      agentDefinitionId: "agent-1",
      llmModelIdentifier: "test-model",
      autoExecuteTools: false,
      workspaceId: null,
      memoryDir: null,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    }),
    runtimeContext: null,
  });
  const lifecycleState = new AgentTurnLifecycleState();
  let snapshot = options.snapshot ?? activeIdleSnapshot();
  const processors = options.deriveEvent
    ? [{ process: async () => [options.deriveEvent!] }]
    : [];
  const pipeline = new AgentRunEventPipeline(
    processors,
    [],
    [new LifecycleStatusEventTransformer()],
  );
  const event = (
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ): AgentRunEvent => ({ eventType, runId: "run-1", payload, statusHint: null });
  const process = (events: AgentRunEvent[]) => pipeline.process({
    runContext: runContext as never,
    events,
    lifecycleState,
    runtimeLifecycleSnapshot: snapshot,
  });
  return {
    event,
    lifecycleState,
    process,
    setSnapshot: (value: AgentRuntimeLifecycleSnapshot) => {
      snapshot = value;
    },
  };
};

const statuses = (events: AgentRunEvent[]) => events
  .filter((event) => event.eventType === AgentRunEventType.AGENT_STATUS)
  .map((event) => event.payload.status);

describe("LifecycleStatusEventTransformer", () => {
  it("orders activity status before content and terminal status after content", async () => {
    const { event, process } = createHarness();

    const started = await process([
      event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" }),
    ]);
    expect(started.map((item) => item.eventType)).toEqual([
      AgentRunEventType.AGENT_STATUS,
      AgentRunEventType.TURN_STARTED,
    ]);
    expect(statuses(started)).toEqual(["running"]);

    const completed = await process([
      event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
    ]);
    expect(completed.map((item) => item.eventType)).toEqual([
      AgentRunEventType.TURN_COMPLETED,
      AgentRunEventType.AGENT_STATUS,
    ]);
    expect(statuses(completed)).toEqual(["idle"]);

    const late = await process([
      event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        turn_id: "turn-a",
        invocation_id: "call-a",
      }),
    ]);
    expect(late.map((item) => item.eventType)).toEqual([
      AgentRunEventType.AGENT_STATUS,
      AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
    ]);
    expect(statuses(late)).toEqual(["idle"]);
  });

  it("protects a newer identified turn from stale terminal and activity", async () => {
    const harness = createHarness();
    await harness.process([
      harness.event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" }),
      harness.event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
      harness.event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-b" }),
    ]);

    const processed = await harness.process([
      harness.event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
      harness.event(AgentRunEventType.SEGMENT_CONTENT, {
        turn_id: "turn-a",
        delta: "late",
      }),
    ]);

    expect(statuses(processed)).toEqual(["running", "running"]);
    expect(harness.lifecycleState.activeTurn).toEqual({
      kind: "IDENTIFIED",
      turnId: "turn-b",
    });
  });

  it("does not let uncorrelated activity open a turn", async () => {
    const { event, lifecycleState, process } = createHarness();

    const processed = await process([
      event(AgentRunEventType.SEGMENT_CONTENT, { turn_id: "turn-a", delta: "orphan" }),
    ]);

    expect(statuses(processed)).toEqual(["idle"]);
    expect(lifecycleState.activeTurn).toEqual({ kind: "NONE" });
  });

  it("keeps diagnostic errors recoverable and terminal errors retired", async () => {
    const harness = createHarness();
    await harness.process([
      harness.event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-b" }),
    ]);

    const diagnostic = await harness.process([
      harness.event(AgentRunEventType.ERROR, {
        message: "recoverable",
        error_scope: "turn",
        error_effect: "diagnostic",
        turn_id: "turn-b",
      }),
    ]);
    expect(diagnostic.map((item) => item.eventType)).toEqual([
      AgentRunEventType.ERROR,
      AgentRunEventType.AGENT_STATUS,
    ]);
    expect(statuses(diagnostic)).toEqual(["running"]);

    const terminal = await harness.process([
      harness.event(AgentRunEventType.ERROR, {
        message: "failed",
        error_scope: "turn",
        error_effect: "terminal",
        turn_id: "turn-b",
      }),
    ]);
    expect(statuses(terminal)).toEqual(["error"]);

    const late = await harness.process([
      harness.event(AgentRunEventType.SEGMENT_CONTENT, {
        turn_id: "turn-b",
        delta: "late",
      }),
    ]);
    expect(statuses(late)).toEqual(["error"]);
    expect(harness.lifecycleState.activeTurn).toEqual({ kind: "NONE" });
  });

  it("reconciles fresh identified, anonymous, offline, and racy empty snapshots", async () => {
    const harness = createHarness();
    harness.setSnapshot({
      availability: "active",
      phase: "running",
      currentTurn: { kind: "IDENTIFIED", turnId: "turn-live" },
    });
    expect(statuses(await harness.process([
      harness.event(AgentRunEventType.TOKEN_USAGE_UPDATED, {}),
    ]))).toEqual(["running"]);

    harness.setSnapshot(activeIdleSnapshot());
    expect(statuses(await harness.process([
      harness.event(AgentRunEventType.SEGMENT_CONTENT, { turn_id: "turn-live", delta: "x" }),
    ]))).toEqual(["running"]);

    await harness.process([
      harness.event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-live" }),
    ]);
    harness.setSnapshot({
      availability: "active",
      phase: "running",
      currentTurn: { kind: "ANONYMOUS" },
    });
    expect(statuses(await harness.process([
      harness.event(AgentRunEventType.SEGMENT_CONTENT, { delta: "anonymous" }),
    ]))).toEqual(["running"]);

    harness.setSnapshot({
      availability: "offline",
      phase: "idle",
      currentTurn: { kind: "NONE" },
    });
    expect(statuses(await harness.process([
      harness.event(AgentRunEventType.TOKEN_USAGE_UPDATED, {}),
    ]))).toEqual(["offline"]);
  });

  it("does not reopen a retired turn from a stale runtime snapshot", async () => {
    const harness = createHarness();
    await harness.process([
      harness.event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" }),
      harness.event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
    ]);
    harness.setSnapshot({
      availability: "active",
      phase: "running",
      currentTurn: { kind: "IDENTIFIED", turnId: "turn-a" },
    });

    const processed = await harness.process([
      harness.event(AgentRunEventType.SEGMENT_CONTENT, { turn_id: "turn-a", delta: "late" }),
    ]);

    expect(statuses(processed)).toEqual(["idle"]);
    expect(harness.lifecycleState.activeTurn).toEqual({ kind: "NONE" });
  });

  it("emits status companions for processor-derived events", async () => {
    const derived: AgentRunEvent = {
      eventType: AgentRunEventType.FILE_CHANGE,
      runId: "run-1",
      payload: { path: "changed.ts" },
      statusHint: null,
    };
    const harness = createHarness({ deriveEvent: derived });

    const processed = await harness.process([
      harness.event(AgentRunEventType.SEGMENT_CONTENT, { delta: "source" }),
    ]);

    expect(processed.map((item) => item.eventType)).toEqual([
      AgentRunEventType.AGENT_STATUS,
      AgentRunEventType.SEGMENT_CONTENT,
      AgentRunEventType.AGENT_STATUS,
      AgentRunEventType.FILE_CHANGE,
    ]);
    expect(statuses(processed)).toEqual(["idle", "idle"]);
  });

  it("normalizes every explicit status event into one canonical status event", async () => {
    const harness = createHarness();

    expect(statuses(await harness.process([
      harness.event(AgentRunEventType.AGENT_STATUS, { status: "initializing" }),
    ]))).toEqual(["initializing"]);
    expect(statuses(await harness.process([
      harness.event(AgentRunEventType.AGENT_STATUS, { status: "running" }),
    ]))).toEqual(["idle"]);
    expect(statuses(await harness.process([
      harness.event(AgentRunEventType.AGENT_STATUS, { status: "idle" }),
    ]))).toEqual(["idle"]);
  });
});
