import { describe, expect, it } from "vitest";
import { mergeProjectionBundles } from "../../../../src/run-history/projection/run-projection-merge.js";
import type { RunProjection } from "../../../../src/run-history/projection/run-projection-types.js";

const createProjection = (
  overrides: Partial<RunProjection>,
): RunProjection => ({
  runId: "run-merge",
  conversation: [],
  activities: [],
  summary: null,
  lastActivityAt: null,
  ...overrides,
});

describe("mergeProjectionBundles", () => {
  it("deduplicates and enriches local/native tool rows by stable invocation id", () => {
    const localProjection = createProjection({
      conversation: [
        {
          kind: "tool_call_pending",
          invocationId: "call-1",
          role: null,
          content: null,
          toolName: "send_message_to",
          toolArgs: {},
          toolResult: null,
          toolError: null,
          media: null,
          ts: 10,
        },
      ],
      activities: [
        {
          invocationId: "call-1",
          toolName: "send_message_to",
          type: "tool_call",
          status: "parsed",
          contextText: "tool",
          arguments: {},
          logs: [],
          result: null,
          error: null,
          ts: 10,
          detailLevel: "source_limited",
        },
      ],
    });
    const nativeProjection = createProjection({
      conversation: [
        {
          kind: "tool_call",
          invocationId: "call-1",
          role: null,
          content: null,
          toolName: "send_message_to",
          toolArgs: { recipient_name: "code_reviewer", content: "handoff" },
          toolResult: { success: true },
          toolError: null,
          media: null,
          ts: 12,
        },
      ],
      activities: [
        {
          invocationId: "call-1",
          toolName: "send_message_to",
          type: "tool_call",
          status: "success",
          contextText: "send_message_to",
          arguments: { recipient_name: "code_reviewer", content: "handoff" },
          logs: [],
          result: { success: true },
          error: null,
          ts: 12,
          detailLevel: "source_limited",
        },
      ],
    });

    const merged = mergeProjectionBundles("run-merge", localProjection, nativeProjection);

    expect(merged?.conversation).toHaveLength(1);
    expect(merged?.conversation[0]).toMatchObject({
      kind: "tool_call",
      invocationId: "call-1",
      toolName: "send_message_to",
      toolArgs: { recipient_name: "code_reviewer", content: "handoff" },
      toolResult: { success: true },
      ts: 10,
    });
    expect(merged?.activities).toHaveLength(1);
    expect(merged?.activities[0]).toMatchObject({
      invocationId: "call-1",
      status: "success",
      contextText: "send_message_to",
      arguments: { recipient_name: "code_reviewer", content: "handoff" },
      result: { success: true },
      ts: 10,
    });
  });

  it("does not over-collapse generated source-scoped fallback invocation ids", () => {
    const localProjection = createProjection({
      conversation: [
        {
          kind: "tool_call",
          invocationId: "codex-0-1",
          role: null,
          content: null,
          toolName: "first_tool",
          toolArgs: { value: "first" },
          toolResult: { ok: true },
          toolError: null,
          media: null,
          ts: 1,
        },
      ],
      activities: [
        {
          invocationId: "codex-0-1",
          toolName: "first_tool",
          type: "tool_call",
          status: "success",
          contextText: "first_tool",
          arguments: { value: "first" },
          logs: [],
          result: { ok: true },
          error: null,
          ts: 1,
          detailLevel: "source_limited",
        },
      ],
    });
    const nativeProjection = createProjection({
      conversation: [
        {
          kind: "tool_call",
          invocationId: "codex-0-1",
          role: null,
          content: null,
          toolName: "second_tool",
          toolArgs: { value: "second" },
          toolResult: { ok: true },
          toolError: null,
          media: null,
          ts: 2,
        },
      ],
      activities: [
        {
          invocationId: "codex-0-1",
          toolName: "second_tool",
          type: "tool_call",
          status: "success",
          contextText: "second_tool",
          arguments: { value: "second" },
          logs: [],
          result: { ok: true },
          error: null,
          ts: 2,
          detailLevel: "source_limited",
        },
      ],
    });

    const merged = mergeProjectionBundles("run-merge", localProjection, nativeProjection);

    expect(merged?.conversation.map((entry) => entry.toolName)).toEqual([
      "first_tool",
      "second_tool",
    ]);
    expect(merged?.activities.map((entry) => entry.toolName)).toEqual([
      "first_tool",
      "second_tool",
    ]);
  });
});
