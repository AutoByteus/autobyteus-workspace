import { describe, expect, it } from "vitest";
import type { JsonObject } from "../../../../../../src/agent-execution/backends/codex/codex-app-server-json.js";
import { CodexThreadEventConverter } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { AgentRunEventType } from "../../../../../../src/agent-execution/domain/agent-run-event.js";

const isReasoningEnd = (event: { eventType: AgentRunEventType; payload: Record<string, unknown> }) =>
  event.eventType === AgentRunEventType.SEGMENT_END &&
  event.payload.segment_type === "reasoning";

const emitCompletedReasoning = (
  converter: CodexThreadEventConverter,
  turnId: string,
  providerItemId: string,
  text: string,
) => {
  const events = converter.convert({
    method: CodexThreadEventName.ITEM_COMPLETED,
    params: {
      turnId,
      item: { type: "reasoning", id: providerItemId, summary: [{ text }] },
    },
  });
  expect(events).toHaveLength(1);
  return events[0]!;
};

const expectBoundaryDisposition = (
  method: string,
  params: JsonObject,
  expected: "clear" | "preserve",
) => {
  const converter = new CodexThreadEventConverter("run-1");
  const before = emitCompletedReasoning(converter, "turn-1", "provider-a", "first");
  const boundaryEvents = converter.convert({ method, params });
  const after = emitCompletedReasoning(converter, "turn-1", "provider-b", "second");

  if (expected === "clear") {
    expect(boundaryEvents[0]).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_END,
      payload: {
        id: before.payload.id,
        turn_id: "turn-1",
        segment_type: "reasoning",
      },
    });
    expect(boundaryEvents.filter(isReasoningEnd))
      .toHaveLength(1);
    expect(Object.keys(boundaryEvents[0]!.payload).sort()).toEqual([
      "id",
      "segment_type",
      "turn_id",
    ]);
    expect(after.payload.id).not.toBe(before.payload.id);
    expect(after.payload.delta).toBe("second");
  } else {
    expect(boundaryEvents.some(isReasoningEnd))
      .toBe(false);
    expect(after.payload.id).toBe(before.payload.id);
    expect(after.payload.delta).toBe("\n\nsecond");
  }
};

const expectMatchingToolUpdatePreserves = (
  start: { method: string; params: JsonObject },
  update: { method: string; params: JsonObject },
) => {
  const converter = new CodexThreadEventConverter("run-1");
  converter.convert(start);
  const before = emitCompletedReasoning(converter, "turn-1", "provider-a", "first");
  const updateEvents = converter.convert(update);
  const after = emitCompletedReasoning(converter, "turn-1", "provider-b", "second");

  expect(updateEvents.some(isReasoningEnd))
    .toBe(false);
  expect(after.payload).toMatchObject({
    id: before.payload.id,
    delta: "\n\nsecond",
  });
};

describe("Codex reasoning block conversion", () => {
  it("groups completed provider snapshots and ignores repeated known-item completion", () => {
    const converter = new CodexThreadEventConverter("run-1");
    const first = emitCompletedReasoning(converter, "turn-1", "provider-a", "first");
    const second = emitCompletedReasoning(converter, "turn-1", "provider-b", "second");
    const repeated = converter.convert({
      method: CodexThreadEventName.ITEM_REASONING_COMPLETED,
      params: {
        turnId: "turn-1",
        item: { id: "provider-b", summary: [{ text: "second" }] },
      },
    });

    expect(first.payload.id).toEqual(expect.stringMatching(/^reasoning-block:[^:]+:1$/));
    expect(first.payload.id).not.toBe("provider-a");
    expect(first.payload).toMatchObject({
      turnId: "turn-1",
      item: { type: "reasoning", id: "provider-a", summary: [{ text: "first" }] },
      delta: "first",
      segment_type: "reasoning",
    });
    expect(second.payload).toMatchObject({
      id: first.payload.id,
      delta: "\n\nsecond",
      segment_type: "reasoning",
    });
    expect(repeated).toEqual([]);
  });

  it("emits adjacent content and end with one identity when a completed snapshot has no turn", () => {
    const converter = new CodexThreadEventConverter("run-1");
    const events = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        timestamp: 123,
        item: { type: "reasoning", id: "provider-a", summary: [{ text: "first" }] },
      },
    });

    expect(events.map((event) => event.eventType)).toEqual([
      AgentRunEventType.SEGMENT_CONTENT,
      AgentRunEventType.SEGMENT_END,
    ]);
    expect(events[0]!.payload).toMatchObject({
      id: events[1]!.payload.id,
      timestamp: 123,
      delta: "first",
      segment_type: "reasoning",
    });
    expect(events[1]!.payload).toEqual({
      id: events[0]!.payload.id,
      turn_id: null,
      segment_type: "reasoning",
    });
    expect(converter.convert({
      method: CodexThreadEventName.TURN_COMPLETED,
      params: {},
    }).filter((event) => event.eventType === AgentRunEventType.SEGMENT_END)).toEqual([]);
  });

  it("treats current and legacy reasoning text deltas as permanent state-free no-ops", () => {
    const converter = new CodexThreadEventConverter("run-1");
    const deltaMethods = [
      CodexThreadEventName.ITEM_REASONING_SUMMARY_TEXT_DELTA,
      CodexThreadEventName.ITEM_REASONING_DELTA,
      CodexThreadEventName.ITEM_REASONING_SUMMARY_PART_ADDED,
    ];
    const sendDeltas = () => deltaMethods.flatMap((method) => converter.convert({
      method,
      params: { turnId: "turn-1", itemId: "provider-delta", delta: "ignored" },
    }));

    expect(sendDeltas()).toEqual([]);
    const first = emitCompletedReasoning(converter, "turn-1", "provider-a", "first");
    expect(first.payload.id).toEqual(expect.stringMatching(/:1$/));
    expect(sendDeltas()).toEqual([]);
    const second = emitCompletedReasoning(converter, "turn-1", "provider-b", "second");
    expect(second.payload.id).toBe(first.payload.id);

    converter.convert({
      method: CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,
      params: { turnId: "turn-1", delta: "" },
    });
    expect(sendDeltas()).toEqual([]);
    const afterBoundary = emitCompletedReasoning(converter, "turn-1", "provider-c", "third");
    expect(afterBoundary.payload.id).toEqual(expect.stringMatching(/:2$/));
  });

  it("groups missing provider identities and separates them only at a real boundary", () => {
    const converter = new CodexThreadEventConverter("run-1");
    const emitWithoutProviderId = (text: string) => converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: { turnId: "turn-1", item: { type: "reasoning", summary: [{ text }] } },
    })[0]!;

    const first = emitWithoutProviderId("first");
    const second = emitWithoutProviderId("second");
    converter.convert({
      method: CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,
      params: { delta: "" },
    });
    const afterBoundary = emitWithoutProviderId("third");

    expect(second.payload).toMatchObject({ id: first.payload.id, delta: "\n\nsecond" });
    expect(afterBoundary.payload.id).not.toBe(first.payload.id);
  });

  it.each([
    ["user message start", CodexThreadEventName.ITEM_STARTED, { turnId: "turn-1", item: { type: "userMessage" } }],
    ["ordinary item start", CodexThreadEventName.ITEM_STARTED, { turnId: "turn-1", item: { type: "agentMessage", id: "message-1" } }],
    ["tool start", CodexThreadEventName.ITEM_STARTED, { turnId: "turn-1", item: { type: "commandExecution", id: "tool-1", command: "pwd" } }],
    ["empty assistant delta", CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA, { turnId: "turn-1", delta: "" }],
    ["approval request", CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL, { turnId: "turn-1", invocation_id: "tool-1" }],
    ["result-first completion", CodexThreadEventName.ITEM_COMPLETED, { turnId: "turn-1", item: { type: "commandExecution", id: "tool-1", command: "pwd" } }],
    ["result-first approval update", CodexThreadEventName.LOCAL_TOOL_APPROVED, { turnId: "turn-1", invocation_id: "tool-1" }],
    ["result-first local completion", CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED, { turnId: "turn-1", invocation_id: "tool-1", tool_name: "demo" }],
    ["identity-missing local completion", CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED, { turnId: "turn-1" }],
    ["result-first file log", CodexThreadEventName.ITEM_FILE_CHANGE_OUTPUT_DELTA, { turnId: "turn-1", invocation_id: "tool-1", delta: "changed" }],
    ["result-first raw log", CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED, { turnId: "turn-1", item: { type: "functionCallOutput", call_id: "tool-1", output: "done" } }],
    ["turn completion", CodexThreadEventName.TURN_COMPLETED, { turnId: "turn-1" }],
    ["turn start", CodexThreadEventName.TURN_STARTED, { turnId: "turn-1" }],
    ["terminal error", CodexThreadEventName.ERROR, { message: "failed" }],
  ] as Array<[string, string, JsonObject]>) (
    "clears for ordered-card creation: %s",
    (_label, method, params) => expectBoundaryDisposition(method, params, "clear"),
  );

  it.each([
    ["non-tool completion", CodexThreadEventName.ITEM_COMPLETED, { turnId: "turn-1", item: { type: "agentMessage", id: "message-1" } }],
    ["ignored tool call request", CodexThreadEventName.ITEM_TOOL_CALL, { turnId: "turn-1" }],
    ["ignored permission request", CodexThreadEventName.ITEM_PERMISSIONS_REQUEST_APPROVAL, { turnId: "turn-1" }],
    ["empty file output", CodexThreadEventName.ITEM_FILE_CHANGE_OUTPUT_DELTA, { turnId: "turn-1" }],
    ["empty raw output", CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED, { turnId: "turn-1", item: { type: "functionCallOutput" } }],
    ["reasoning start", CodexThreadEventName.ITEM_STARTED, { turnId: "turn-1", item: { type: "reasoning" } }],
    ["compaction start", CodexThreadEventName.ITEM_STARTED, { turnId: "turn-1", item: { type: "contextCompaction", id: "compact-1" } }],
    ["compaction completion", CodexThreadEventName.ITEM_COMPLETED, { turnId: "turn-1", item: { type: "contextCompaction", id: "compact-1" } }],
    ["compaction trigger", CodexThreadEventName.ITEM_STARTED, { turnId: "turn-1", item: { type: "compactionTrigger" } }],
    ["plan delta", CodexThreadEventName.ITEM_PLAN_DELTA, { turnId: "turn-1" }],
    ["turn diff", CodexThreadEventName.TURN_DIFF_UPDATED, { turnId: "turn-1" }],
    ["turn progress", CodexThreadEventName.TURN_TASK_PROGRESS_UPDATED, { turnId: "turn-1" }],
    ["raw compaction", CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED, { turnId: "turn-1", item: { type: "compaction", id: "compact-1" } }],
    ["thread compacted", CodexThreadEventName.THREAD_COMPACTED, { turnId: "turn-1", id: "compact-1" }],
    ["thread started", CodexThreadEventName.THREAD_STARTED, {}],
    ["thread status", CodexThreadEventName.THREAD_STATUS_CHANGED, {}],
    ["thread tokens", CodexThreadEventName.THREAD_TOKEN_USAGE_UPDATED, {}],
    ["unknown item", "item/futureNotification", { turnId: "turn-1" }],
    ["unknown raw", "rawResponseItem/futureNotification", { turnId: "turn-1" }],
    ["unknown thread", "thread/futureNotification", { turnId: "turn-1" }],
    ["internal notification", "codex/event/status", { turnId: "turn-1" }],
  ] as Array<[string, string, JsonObject]>) (
    "preserves for in-place or no-effect event: %s",
    (_label, method, params) => expectBoundaryDisposition(method, params, "preserve"),
  );

  it.each([
    [
      "success result",
      { method: CodexThreadEventName.ITEM_STARTED, params: { turnId: "turn-1", item: { type: "commandExecution", id: "tool-1", command: "pwd" } } },
      { method: CodexThreadEventName.ITEM_COMPLETED, params: { turnId: "turn-1", item: { type: "commandExecution", id: "tool-1", command: "pwd", status: "completed" } } },
    ],
    [
      "failure result",
      { method: CodexThreadEventName.ITEM_STARTED, params: { turnId: "turn-1", item: { type: "commandExecution", id: "tool-1", command: "pwd" } } },
      { method: CodexThreadEventName.ITEM_COMPLETED, params: { turnId: "turn-1", item: { type: "commandExecution", id: "tool-1", command: "pwd", status: "failed" } } },
    ],
    [
      "denial result",
      { method: CodexThreadEventName.ITEM_STARTED, params: { turnId: "turn-1", item: { type: "fileChange", id: "tool-1", path: "demo.ts" } } },
      { method: CodexThreadEventName.ITEM_COMPLETED, params: { turnId: "turn-1", item: { type: "fileChange", id: "tool-1", path: "demo.ts", status: "declined" } } },
    ],
    [
      "approval update",
      { method: CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED, params: { turnId: "turn-1", invocation_id: "tool-1" } },
      { method: CodexThreadEventName.LOCAL_TOOL_APPROVED, params: { turnId: "turn-1", invocation_id: "tool-1" } },
    ],
    [
      "start after approval",
      { method: CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL, params: { turnId: "turn-1", itemId: "tool-1" } },
      { method: CodexThreadEventName.ITEM_STARTED, params: { turnId: "turn-1", item: { type: "commandExecution", id: "tool-1", command: "pwd" } } },
    ],
    [
      "local MCP completion",
      { method: CodexThreadEventName.ITEM_STARTED, params: { turnId: "turn-1", item: { type: "mcpToolCall", id: "tool-1", tool: "demo" } } },
      { method: CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED, params: { turnId: "turn-1", invocation_id: "tool-1", tool_name: "demo" } },
    ],
    [
      "file log",
      { method: CodexThreadEventName.ITEM_STARTED, params: { turnId: "turn-1", item: { type: "fileChange", id: "tool-1", path: "demo.ts" } } },
      { method: CodexThreadEventName.ITEM_FILE_CHANGE_OUTPUT_DELTA, params: { turnId: "turn-1", itemId: "tool-1", delta: "changed" } },
    ],
    [
      "raw output",
      { method: CodexThreadEventName.ITEM_STARTED, params: { turnId: "turn-1", item: { type: "commandExecution", id: "tool-1", command: "pwd" } } },
      { method: CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED, params: { turnId: "turn-1", item: { type: "functionCallOutput", call_id: "tool-1", output: "done" } } },
    ],
  ] as Array<[string, { method: string; params: JsonObject }, { method: string; params: JsonObject }]>) (
    "preserves reasoning for matching existing-card %s",
    (_label, start, update) => expectMatchingToolUpdatePreserves(start, update),
  );

  it("keeps one block through the exact long-running-tool result sequence", () => {
    const converter = new CodexThreadEventConverter("run-1");
    converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: { turnId: "turn-1", item: { type: "commandExecution", id: "tool-1", command: "sleep 1" } },
    });
    const reasoningA = emitCompletedReasoning(converter, "turn-1", "provider-a", "A");
    const matchingResult = converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: { turnId: "turn-1", item: { type: "commandExecution", id: "tool-1", command: "sleep 1", status: "completed" } },
    });
    const reasoningB = emitCompletedReasoning(converter, "turn-1", "provider-b", "B");
    const nextTool = converter.convert({
      method: CodexThreadEventName.ITEM_STARTED,
      params: { turnId: "turn-1", item: { type: "commandExecution", id: "tool-2", command: "pwd" } },
    });
    const afterBoundary = emitCompletedReasoning(converter, "turn-1", "provider-c", "C");

    expect(reasoningB.payload).toMatchObject({ id: reasoningA.payload.id, delta: "\n\nB" });
    expect(matchingResult.some((event) => event.eventType === AgentRunEventType.SEGMENT_END))
      .toBe(false);
    expect(nextTool[0]).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_END,
      payload: { id: reasoningA.payload.id },
    });
    expect(afterBoundary.payload.id).not.toBe(reasoningA.payload.id);
  });

  it("clears every active turn when an ordered boundary has no turn id", () => {
    const converter = new CodexThreadEventConverter("run-1");
    const firstA = emitCompletedReasoning(converter, "turn-a", "provider-a", "a");
    const firstB = emitCompletedReasoning(converter, "turn-b", "provider-b", "b");
    const ends = converter.convert({
      method: CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,
      params: { delta: "" },
    });

    expect(ends.map((event) => [event.eventType, event.payload.id, event.payload.turn_id]))
      .toEqual([
        [AgentRunEventType.SEGMENT_END, firstA.payload.id, "turn-a"],
        [AgentRunEventType.SEGMENT_END, firstB.payload.id, "turn-b"],
      ]);
    expect(emitCompletedReasoning(converter, "turn-a", "provider-a", "a2").payload.id)
      .not.toBe(firstA.payload.id);
    expect(emitCompletedReasoning(converter, "turn-b", "provider-b", "b2").payload.id)
      .not.toBe(firstB.payload.id);
  });

  it.each([
    [CodexThreadEventName.TURN_STARTED, { turnId: "turn-c" }],
    [CodexThreadEventName.ERROR, { message: "failed" }],
  ] as Array<[string, JsonObject]>) (
    "closes all tracked identities deterministically before reachable %s output",
    (method, params) => {
      const converter = new CodexThreadEventConverter("run-1");
      const firstA = emitCompletedReasoning(converter, "turn-a", "provider-a", "a");
      const firstB = emitCompletedReasoning(converter, "turn-b", "provider-b", "b");

      const boundaryEvents = converter.convert({ method, params });

      expect(boundaryEvents.slice(0, 2).map((event) => [
        event.eventType,
        event.payload.id,
        event.payload.turn_id,
      ])).toEqual([
        [AgentRunEventType.SEGMENT_END, firstA.payload.id, "turn-a"],
        [AgentRunEventType.SEGMENT_END, firstB.payload.id, "turn-b"],
      ]);
      expect(converter.convert({ method, params })
        .filter((event) => event.eventType === AgentRunEventType.SEGMENT_END)).toEqual([]);
    },
  );
});
