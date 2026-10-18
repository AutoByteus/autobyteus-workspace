import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
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
import { AgentSegmentLifecycleEventTransformer } from "../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-event-transformer.js";
import { AgentSegmentLifecycleState } from "../../../../src/agent-execution/events/processors/segment-lifecycle/agent-segment-lifecycle-state.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const NOTICE = "Some of the agent's output in this turn could not be shown.";

const createHarness = () => {
  const runContext = new AgentRunContext({
    runId: "run-1",
    config: new AgentRunConfig({
      agentDefinitionId: "agent-1",
      llmModelIdentifier: "test-model",
      autoExecuteTools: false,
      workspaceId: null,
      memoryDir: null,
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    }),
    runtimeContext: null,
  });
  const lifecycleState = new AgentTurnLifecycleState();
  const segmentLifecycleState = new AgentSegmentLifecycleState();
  let snapshot: AgentRuntimeLifecycleSnapshot = { availability: "active", phase: "idle", currentTurn: { kind: "NONE" } };
  const pipeline = new AgentRunEventPipeline(
    [],
    [new AgentSegmentLifecycleEventTransformer()],
    [new LifecycleStatusEventTransformer()],
  );
  const process = (events: AgentRunEvent[]) => pipeline.process({
    runContext: runContext as never,
    events,
    lifecycleState,
    segmentLifecycleState,
    runtimeLifecycleSnapshot: snapshot,
  });
  return {
    process,
    segmentLifecycleState,
    setSnapshot: (value: AgentRuntimeLifecycleSnapshot) => { snapshot = value; },
  };
};

const event = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent =>
  ({ eventType, runId: "run-1", payload, statusHint: null });
const turnStarted = (turnId: string) => event(AgentRunEventType.TURN_STARTED, { turn_id: turnId });
const turnCompleted = (turnId: string) => event(AgentRunEventType.TURN_COMPLETED, { turn_id: turnId });
const segmentStart = (turnId: string, id: string) =>
  event(AgentRunEventType.SEGMENT_START, { id, turn_id: turnId, segment_type: "text" });
const content = (turnId: string, id: string, delta = "x") =>
  event(AgentRunEventType.SEGMENT_CONTENT, { id, turn_id: turnId, delta });

const notices = (events: AgentRunEvent[]) => events.filter((item) =>
  item.eventType === AgentRunEventType.ERROR && item.payload.code === "AGENT_SEGMENT_LIFECYCLE_INVALID");

let warn: MockInstance<typeof console.warn>;
const rejectionLines = () => warn.mock.calls
  .filter(([tag]) => tag === "[AgentSegmentLifecycleRejected]")
  .map(([, detail]) => detail);
const summaryLines = () => warn.mock.calls
  .filter(([tag]) => tag === "[AgentSegmentLifecycleRejectedSummary]")
  .map(([, detail]) => detail);

describe("AgentSegmentLifecycleEventTransformer rejections", () => {
  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it("shows one plain-language notice and one detailed warning for many rejections in the current turn, and a summary at its end (AC-004, AC-005a)", async () => {
    const { process } = createHarness();
    await process([turnStarted("turn-t")]);

    const rejected = await process([1, 2, 3].map(() => content("turn-t", "never-started")));
    const later = await process([content("turn-t", "never-started"), content("turn-t", "never-started")]);

    expect(rejected.filter((item) => item.eventType === AgentRunEventType.SEGMENT_CONTENT)).toEqual([]);
    expect([...notices(rejected), ...notices(later)].map((item) => item.payload)).toEqual([{
      code: "AGENT_SEGMENT_LIFECYCLE_INVALID",
      message: NOTICE,
      error_scope: "turn",
      error_effect: "diagnostic",
      turn_id: "turn-t",
    }]);
    expect(rejectionLines()).toEqual([{
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      runId: "run-1",
      turnId: "turn-t",
      eventType: AgentRunEventType.SEGMENT_CONTENT,
      segmentId: "never-started",
      reason: "SEGMENT_NOT_STARTED",
    }]);
    expect(summaryLines()).toEqual([]);

    await process([turnCompleted("turn-t")]);
    expect(summaryLines()).toEqual([
      { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, runId: "run-1", turnId: "turn-t", count: 4 },
    ]);
    expect(rejectionLines()).toHaveLength(1);
  });

  it("logs only the first rejection when it is the turn's only one", async () => {
    const { process } = createHarness();
    await process([turnStarted("turn-t"), content("turn-t", "never-started")]);
    await process([turnCompleted("turn-t")]);

    expect(rejectionLines()).toHaveLength(1);
    expect(summaryLines()).toEqual([]);
  });

  it("gives late events of an ended turn no notice, one TURN_ENDED warning, and a summary at the next boundary (AC-005b)", async () => {
    const { process } = createHarness();
    await process([turnStarted("turn-t"), segmentStart("turn-t", "s1"), turnCompleted("turn-t")]);
    await process([turnStarted("turn-u")]);

    const late = await process([content("turn-t", "s1"), content("turn-t", "s1"), content("turn-t", "s1")]);

    expect(notices(late)).toEqual([]);
    expect(late.filter((item) => item.eventType === AgentRunEventType.SEGMENT_CONTENT)).toEqual([]);
    expect(rejectionLines()).toEqual([expect.objectContaining({ turnId: "turn-t", reason: "TURN_ENDED", segmentId: "s1" })]);
    expect(summaryLines()).toEqual([]);

    await process([turnCompleted("turn-u")]);
    expect(summaryLines()).toEqual([expect.objectContaining({ turnId: "turn-t", count: 2 })]);

    // The account lives as long as the run: a much later event is counted, not warned again.
    await process([content("turn-t", "s1")]);
    await process([event(AgentRunEventType.AGENT_STATUS, { status: "offline" })]);
    expect(rejectionLines()).toHaveLength(1);
    expect(summaryLines()).toEqual([
      expect.objectContaining({ turnId: "turn-t", count: 2 }),
      expect.objectContaining({ turnId: "turn-t", count: 1 }),
    ]);
  });

  it("accounts events without a turn id in one run-level account with no notice (AC-005d)", async () => {
    const { process } = createHarness();
    await process([turnStarted("turn-t")]);

    const invalid = await process([
      event(AgentRunEventType.SEGMENT_CONTENT, { id: "s1", delta: "x" }),
      event(AgentRunEventType.SEGMENT_CONTENT, { id: "s2", delta: "y" }),
    ]);

    expect(notices(invalid)).toEqual([]);
    expect(rejectionLines()).toEqual([expect.objectContaining({ turnId: null, segmentId: "s1", reason: "PAYLOAD_INVALID" })]);
    await process([turnCompleted("turn-t")]);
    expect(summaryLines()).toEqual([expect.objectContaining({ turnId: null, count: 1 })]);
  });

  it("gives each turn its own single notice", async () => {
    const { process } = createHarness();
    const first = await process([turnStarted("turn-t"), content("turn-t", "a"), content("turn-t", "b"), turnCompleted("turn-t")]);
    const second = await process([turnStarted("turn-u"), content("turn-u", "a"), content("turn-u", "b")]);

    expect(notices(first).map((item) => item.payload.turn_id)).toEqual(["turn-t"]);
    expect(notices(second).map((item) => item.payload.turn_id)).toEqual(["turn-u"]);
  });

  it("classifies segment rejection reasons", async () => {
    const { process } = createHarness();
    await process([
      turnStarted("turn-t"),
      segmentStart("turn-t", "s1"),
      event(AgentRunEventType.SEGMENT_START, { id: "s1", turn_id: "turn-t", segment_type: "reasoning" }),
      segmentStart("turn-other", "s9"),
      event(AgentRunEventType.SEGMENT_END, { id: "s1", turn_id: "turn-t" }),
      content("turn-t", "s1"),
      event(AgentRunEventType.SEGMENT_END, { id: "missing", turn_id: "turn-t" }),
    ]);
    await process([turnCompleted("turn-t")]);
    await process([turnStarted("turn-other")]);
    await process([turnCompleted("turn-other")]);

    expect(rejectionLines()).toEqual([
      expect.objectContaining({ turnId: "turn-t", reason: "SEGMENT_TYPE_CONFLICT" }),
      expect.objectContaining({ turnId: "turn-other", reason: "TURN_NOT_CURRENT" }),
    ]);
    // turn-t's later rejections (SEGMENT_ENDED, SEGMENT_NOT_STARTED) are counted, not warned.
    expect(summaryLines()).toEqual([expect.objectContaining({ turnId: "turn-t", count: 2 })]);
  });

  it("logs pending summaries at an in-pipeline release (runtime-global error, offline snapshot)", async () => {
    const { process, setSnapshot } = createHarness();
    await process([turnStarted("turn-t"), content("turn-t", "a"), content("turn-t", "b")]);
    await process([event(AgentRunEventType.ERROR, {
      code: "RUNTIME_CRASHED", message: "crash", error_scope: "runtime", error_effect: "terminal",
    })]);
    expect(summaryLines()).toEqual([expect.objectContaining({ turnId: "turn-t", count: 1 })]);

    await process([turnStarted("turn-u"), content("turn-u", "a"), content("turn-u", "b"), content("turn-u", "c")]);
    setSnapshot({ availability: "offline", phase: "idle", currentTurn: { kind: "NONE" } });
    await process([]);
    expect(summaryLines()).toEqual([
      expect.objectContaining({ turnId: "turn-t", count: 1 }),
      expect.objectContaining({ turnId: "turn-u", count: 2 }),
    ]);
  });
});

describe("AgentSegmentLifecycleState rejection accounting", () => {
  it("notices only the current turn, once, and returns pending summaries on release", () => {
    const state = new AgentSegmentLifecycleState();
    state.observeTurnStarted("turn-t");

    expect(state.recordRejection("turn-other")).toEqual({ warn: true, showNotice: false });
    expect(state.recordRejection("turn-t")).toEqual({ warn: true, showNotice: true });
    expect(state.recordRejection("turn-t")).toEqual({ warn: false, showNotice: false });
    expect(state.recordRejection(null)).toEqual({ warn: true, showNotice: false });
    expect(state.recordRejection(null)).toEqual({ warn: false, showNotice: false });

    expect(state.releaseRun()).toEqual([
      { turnId: "turn-t", count: 1 },
      { turnId: null, count: 1 },
    ]);
    expect(state.takeRejectionSummaries()).toEqual([]);
    expect(state.recordRejection("turn-t")).toEqual({ warn: false, showNotice: false });
  });
});
