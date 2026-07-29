import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunEventPipeline } from "../../../../src/agent-execution/events/agent-run-event-pipeline.js";
import { LifecycleStatusEventTransformer } from "../../../../src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-transformer.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const createHarness = (transformer = new LifecycleStatusEventTransformer()) => {
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
  const pipeline = new AgentRunEventPipeline([], [transformer]);
  const event = (
    eventType: AgentRunEventType,
    payload: Record<string, unknown>,
  ): AgentRunEvent => ({ eventType, runId: "run-1", payload, statusHint: null });
  const process = (events: AgentRunEvent[]) => pipeline.process({ runContext, events });
  return { event, process };
};

const statuses = (events: AgentRunEvent[]) => events
  .filter((event) => event.eventType === AgentRunEventType.AGENT_STATUS)
  .map((event) => event.payload.status);

describe("LifecycleStatusEventTransformer", () => {
  it("keeps the exact completed-turn plus late-tool sequence idle while preserving content", async () => {
    const { event, process } = createHarness();
    expect(statuses(await process([
      event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" }),
      event(AgentRunEventType.AGENT_STATUS, { status: "running", can_interrupt: true }),
    ]))).toEqual(["running"]);
    expect(statuses(await process([
      event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
      event(AgentRunEventType.AGENT_STATUS, { status: "idle", can_interrupt: false }),
    ]))).toEqual(["idle"]);

    const late = await process([
      event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, {
        turn_id: "turn-a",
        invocation_id: "call-a",
        result: "late",
      }),
    ]);

    expect(late).toHaveLength(1);
    expect(late[0].eventType).toBe(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
    expect(statuses(late)).toEqual([]);
  });

  it("protects a newer identified turn from old terminal, status, and activity", async () => {
    const { event, process } = createHarness();
    await process([event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" })]);
    await process([event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" })]);
    await process([event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-b" })]);

    const processed = await process([
      event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
      event(AgentRunEventType.AGENT_STATUS, { status: "idle", can_interrupt: false }),
      event(AgentRunEventType.SEGMENT_CONTENT, {
        turn_id: "turn-a",
        id: "late-a",
        delta: "late",
      }),
    ]);

    expect(statuses(processed)).toEqual([]);
    expect(processed.map((item) => item.eventType)).toEqual([
      AgentRunEventType.TURN_COMPLETED,
      AgentRunEventType.SEGMENT_CONTENT,
    ]);
  });

  it("derives boundary fallback without treating uncorrelated activity as a turn opener", async () => {
    const { event, process } = createHarness();
    const uncorrelated = await process([
      event(AgentRunEventType.SEGMENT_CONTENT, { turn_id: "turn-a", delta: "orphan" }),
    ]);
    expect(statuses(uncorrelated)).toEqual([]);

    expect(statuses(await process([
      event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" }),
    ]))).toEqual(["running"]);
    expect(statuses(await process([
      event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
    ]))).toEqual(["idle"]);
  });

  it("keeps diagnostics content-only and filters their error companion", async () => {
    const { event, process } = createHarness();
    await process([event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-b" })]);

    const processed = await process([
      event(AgentRunEventType.ERROR, {
        code: "TOOL_ERROR",
        message: "recoverable",
        error_scope: "turn",
        error_effect: "diagnostic",
        turn_id: "turn-b",
      }),
      event(AgentRunEventType.AGENT_STATUS, { status: "error", can_interrupt: false }),
    ]);

    expect(processed.map((item) => item.eventType)).toEqual([AgentRunEventType.ERROR]);
    expect(statuses(processed)).toEqual([]);
  });

  it("allows only exact current-turn activity to recover a status-only error", async () => {
    const { event, process } = createHarness();
    await process([event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-b" })]);
    expect(statuses(await process([
      event(AgentRunEventType.AGENT_STATUS, { status: "error", can_interrupt: false }),
    ]))).toEqual(["error"]);

    expect(statuses(await process([
      event(AgentRunEventType.SEGMENT_CONTENT, { turn_id: "turn-a", delta: "old" }),
    ]))).toEqual([]);
    expect(statuses(await process([
      event(AgentRunEventType.SEGMENT_CONTENT, { turn_id: "turn-b", delta: "current" }),
    ]))).toEqual(["running"]);
  });

  it("makes matching terminal error unrecoverable by later same-turn activity", async () => {
    const { event, process } = createHarness();
    await process([event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-b" })]);
    const failed = await process([
      event(AgentRunEventType.ERROR, {
        code: "TURN_FAILED",
        message: "failed",
        error_scope: "turn",
        error_effect: "terminal",
        turn_id: "turn-b",
      }),
      event(AgentRunEventType.AGENT_STATUS, { status: "error", can_interrupt: false }),
      event(AgentRunEventType.SEGMENT_CONTENT, { turn_id: "turn-b", delta: "late" }),
    ]);
    expect(statuses(failed)).toEqual(["error"]);

    expect(statuses(await process([
      event(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED, { turn_id: "turn-b" }),
    ]))).toEqual([]);
  });

  it("keeps duplicate starts and terminals idempotent", async () => {
    const { event, process } = createHarness();
    expect(statuses(await process([
      event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" }),
      event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" }),
    ]))).toEqual(["running"]);
    expect(statuses(await process([
      event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
      event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
    ]))).toEqual(["idle"]);
    expect(statuses(await process([
      event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-a" }),
    ]))).toEqual([]);
  });

  it.each(["offline", "initializing", "idle", "running", "error"] as const)(
    "accepts the explicit %s snapshot when no turn is active",
    async (status) => {
      const { event, process } = createHarness();
      expect(statuses(await process([
        event(AgentRunEventType.AGENT_STATUS, { status, can_interrupt: status === "running" }),
      ]))).toEqual([status]);
    },
  );

  it("filters contradictory idle and initializing snapshots while an identified turn is active", async () => {
    const { event, process } = createHarness();
    await process([event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-b" })]);

    const processed = await process([
      event(AgentRunEventType.AGENT_STATUS, { status: "idle", can_interrupt: false }),
      event(AgentRunEventType.AGENT_STATUS, { status: "initializing", can_interrupt: false }),
    ]);
    expect(statuses(processed)).toEqual([]);

    expect(statuses(await process([
      event(AgentRunEventType.AGENT_STATUS, { status: "running", can_interrupt: true }),
    ]))).toEqual(["running"]);
  });

  it("keeps identified terminal evidence from closing anonymous work", async () => {
    const { event, process } = createHarness();
    await process([event(AgentRunEventType.TURN_STARTED, {})]);

    expect(statuses(await process([
      event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-a" }),
    ]))).toEqual([]);
    expect(statuses(await process([
      event(AgentRunEventType.AGENT_STATUS, { status: "initializing", can_interrupt: false }),
    ]))).toEqual([]);
    expect(statuses(await process([
      event(AgentRunEventType.TURN_COMPLETED, {}),
    ]))).toEqual(["idle"]);
  });

  it("applies runtime-global failure but keeps invalid errors content-only", async () => {
    const { event, process } = createHarness();
    await process([event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-b" })]);

    const invalid = await process([
      event(AgentRunEventType.ERROR, {
        message: "missing identity",
        error_scope: "turn",
        error_effect: "terminal",
      }),
      event(AgentRunEventType.AGENT_STATUS, { status: "error", can_interrupt: false }),
    ]);
    expect(invalid.map((item) => item.eventType)).toEqual([AgentRunEventType.ERROR]);

    const global = await process([
      event(AgentRunEventType.ERROR, {
        message: "client closed",
        error_scope: "runtime",
        error_effect: "terminal",
      }),
    ]);
    expect(statuses(global)).toEqual(["error"]);
    expect(statuses(await process([
      event(AgentRunEventType.SEGMENT_CONTENT, { turn_id: "turn-b", delta: "late" }),
    ]))).toEqual([]);
  });

  it("isolates lifecycle state by runtime context even when a restored run reuses the public id", async () => {
    const transformer = new LifecycleStatusEventTransformer();
    const first = createHarness(transformer);
    const restored = createHarness(transformer);
    await first.process([
      first.event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-old" }),
      first.event(AgentRunEventType.TURN_COMPLETED, { turn_id: "turn-old" }),
    ]);

    expect(statuses(await restored.process([
      restored.event(AgentRunEventType.TURN_STARTED, { turn_id: "turn-old" }),
    ]))).toEqual(["running"]);
  });
});
