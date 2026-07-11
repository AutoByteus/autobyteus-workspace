import { describe, expect, it } from "vitest";
import type { JsonObject } from "../../../../../../src/agent-execution/backends/codex/codex-app-server-json.js";
import { CodexThreadEventConverter } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-converter.js";
import { CodexThreadEventName } from "../../../../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";

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
      item: {
        type: "reasoning",
        id: providerItemId,
        summary: [{ text }],
      },
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
  converter.convert({ method, params });
  const after = emitCompletedReasoning(converter, "turn-1", "provider-b", "second");

  if (expected === "clear") {
    expect(after.payload.id).not.toBe(before.payload.id);
    expect(after.payload.delta).toBe("second");
  } else {
    expect(after.payload.id).toBe(before.payload.id);
    expect(after.payload.delta).toBe("\n\nsecond");
  }
};

describe("Codex reasoning block conversion", () => {
  it("groups different completed provider items into one normalized block", () => {
    const converter = new CodexThreadEventConverter("run-1");

    const first = emitCompletedReasoning(converter, "turn-1", "provider-a", "first");
    const second = emitCompletedReasoning(converter, "turn-1", "provider-b", "second");

    expect(first.payload.id).toEqual(expect.stringMatching(/^reasoning-block:[^:]+:1$/));
    expect(first.payload.id).not.toBe("provider-a");
    expect(second.payload).toMatchObject({
      id: first.payload.id,
      delta: "\n\nsecond",
      segment_type: "reasoning",
    });
  });

  it("groups missing provider identities but allocates fresh after a repeated unscoped boundary", () => {
    const converter = new CodexThreadEventConverter("run-1");
    const emitWithoutProviderId = (text: string) => converter.convert({
      method: CodexThreadEventName.ITEM_COMPLETED,
      params: {
        turnId: "turn-1",
        item: { type: "reasoning", summary: [{ text }] },
      },
    })[0]!;

    const first = emitWithoutProviderId("first");
    const second = emitWithoutProviderId("second");
    converter.convert({
      method: CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,
      params: { delta: "" },
    });
    const afterBoundary = emitWithoutProviderId("third");

    expect(second.payload).toMatchObject({
      id: first.payload.id,
      delta: "\n\nsecond",
    });
    expect(afterBoundary.payload.id).not.toBe(first.payload.id);
    expect(afterBoundary.payload.delta).toBe("third");
  });

  it("routes every supported reasoning notification through the singular update contract", () => {
    const converter = new CodexThreadEventConverter("run-1");
    const events = [
      ...converter.convert({
        method: CodexThreadEventName.ITEM_REASONING_DELTA,
        params: { turnId: "turn-1", itemId: "provider-a", delta: "a" },
      }),
      ...converter.convert({
        method: CodexThreadEventName.ITEM_REASONING_SUMMARY_PART_ADDED,
        params: { turnId: "turn-1", itemId: "provider-a", delta: "b" },
      }),
      ...converter.convert({
        method: CodexThreadEventName.ITEM_REASONING_COMPLETED,
        params: {
          turnId: "turn-1",
          item: { id: "provider-a", summary: [{ text: "c" }] },
        },
      }),
      ...converter.convert({
        method: CodexThreadEventName.ITEM_COMPLETED,
        params: {
          turnId: "turn-1",
          item: { id: "provider-b", type: "reasoning", summary: [{ text: "d" }] },
        },
      }),
    ];

    expect(new Set(events.map((event) => event.payload.id)).size).toBe(1);
    expect(events.map((event) => event.payload.delta)).toEqual(["a", "b", "c", "\n\nd"]);
  });

  it.each([
    ["user message start", CodexThreadEventName.ITEM_STARTED, { turnId: "turn-1", item: { type: "userMessage" } }],
    ["ordinary item start", CodexThreadEventName.ITEM_STARTED, { turnId: "turn-1", item: { type: "agentMessage", id: "message-1" } }],
    ["ordinary item completion", CodexThreadEventName.ITEM_COMPLETED, { turnId: "turn-1", item: { type: "agentMessage", id: "message-1" } }],
    ["empty assistant delta", CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA, { turnId: "turn-1", delta: "" }],
    ["command approval", CodexThreadEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL, { turnId: "turn-1" }],
    ["file approval", CodexThreadEventName.ITEM_FILE_CHANGE_REQUEST_APPROVAL, { turnId: "turn-1" }],
    ["local approval request", CodexThreadEventName.LOCAL_TOOL_APPROVAL_REQUESTED, { turnId: "turn-1" }],
    ["local approval result", CodexThreadEventName.LOCAL_TOOL_APPROVED, { turnId: "turn-1" }],
    ["ignored tool call request", CodexThreadEventName.ITEM_TOOL_CALL, { turnId: "turn-1" }],
    ["ignored permission request", CodexThreadEventName.ITEM_PERMISSIONS_REQUEST_APPROVAL, { turnId: "turn-1" }],
    ["empty local MCP completion", CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED, { turnId: "turn-1" }],
    ["empty file output", CodexThreadEventName.ITEM_FILE_CHANGE_OUTPUT_DELTA, { turnId: "turn-1" }],
    ["empty raw function output", CodexThreadEventName.RAW_RESPONSE_ITEM_COMPLETED, { turnId: "turn-1", item: { type: "functionCallOutput" } }],
    ["turn completion", CodexThreadEventName.TURN_COMPLETED, { turnId: "turn-1" }],
    ["turn start", CodexThreadEventName.TURN_STARTED, { turnId: "turn-1" }],
    ["terminal error", CodexThreadEventName.ERROR, { message: "failed" }],
  ] as Array<[string, string, JsonObject]>) (
    "clears before branch-specific returns for %s",
    (_label, method, params) => {
      expectBoundaryDisposition(method, params, "clear");
    },
  );

  it.each([
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
    "preserves or has no effect for %s",
    (_label, method, params) => {
      expectBoundaryDisposition(method, params, "preserve");
    },
  );

  it("clears every active turn when a semantic boundary has no turn id", () => {
    const converter = new CodexThreadEventConverter("run-1");
    const firstA = emitCompletedReasoning(converter, "turn-a", "provider-a", "a");
    const firstB = emitCompletedReasoning(converter, "turn-b", "provider-b", "b");

    converter.convert({
      method: CodexThreadEventName.ITEM_AGENT_MESSAGE_DELTA,
      params: { delta: "" },
    });

    const secondA = emitCompletedReasoning(converter, "turn-a", "provider-a", "a2");
    const secondB = emitCompletedReasoning(converter, "turn-b", "provider-b", "b2");
    expect(secondA.payload.id).not.toBe(firstA.payload.id);
    expect(secondB.payload.id).not.toBe(firstB.payload.id);
  });
});
