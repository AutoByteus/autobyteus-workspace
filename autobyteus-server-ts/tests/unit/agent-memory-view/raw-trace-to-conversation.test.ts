import { describe, expect, it } from "vitest";
import { buildConversationView } from "../../../src/agent-memory-view/transformers/raw-trace-to-conversation.js";

describe("raw trace to conversation", () => {
  it("collapses tool call and result into a single entry", () => {
    const traces = [
      { trace_type: "user", content: "hi" },
      { trace_type: "tool_call", tool_call_id: "1", tool_name: "search", tool_args: { q: "x" } },
      { trace_type: "tool_result", tool_call_id: "1", tool_result: { ok: true } },
    ];

    const entries = buildConversationView(traces, true);
    expect(entries).toHaveLength(2);
    expect(entries[1]?.kind).toBe("tool_call");
    expect(entries[1]?.toolResult).toEqual({ ok: true });
  });

  it("emits orphan tool results when missing call", () => {
    const traces = [
      { trace_type: "tool_result", tool_call_id: "missing", tool_result: { ok: true } },
    ];

    const entries = buildConversationView(traces, true);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.kind).toBe("tool_result_orphan");
  });

  it("keeps explicit tool events when collapse disabled", () => {
    const traces = [
      { trace_type: "tool_call", tool_call_id: "1", tool_name: "search" },
      { trace_type: "tool_result", tool_call_id: "1", tool_result: { ok: true } },
    ];

    const entries = buildConversationView(traces, false);
    expect(entries.map((entry) => entry.kind)).toEqual(["tool_call", "tool_result"]);
  });
});
