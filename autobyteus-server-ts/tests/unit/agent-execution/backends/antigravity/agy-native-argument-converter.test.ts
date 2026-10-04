import { describe, expect, it } from "vitest";
import { AgyStreamEventConverter } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import type { AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
const step = (state = "ACTIVE", parameters: unknown = { TargetFile: "/owned" }): AgyStreamMessage => ({ event: "step_update", step_update: {
  conversation_id: "conversation", step_index: 2, step_type: "tool", state, tool_name: "replace_file_content", tool_info: { parameters },
} });
const setup = () => { const converter = new AgyStreamEventConverter("run", "conversation", "model"); converter.startTurn("turn"); return converter; };

describe("AGY converter native lookup and first snapshot", () => {
  it.each(["ACTIVE", "DONE", "ERROR"])("requests only a valid first %s native observation", (state) => {
    const converter = setup(); const message = step(state);
    expect(converter.getPendingNativeToolArgumentLookup(message)).toEqual({ stepIndex: 2,
      toolName: "replace_file_content", summary: { TargetFile: "/owned" } });
    converter.convert(message);
    expect(converter.getPendingNativeToolArgumentLookup(message)).toBeNull();
  });

  it("skips invalid indices/states/names, nonobject summaries, MCP and conflicting identities without hiding convert errors", () => {
    const converter = setup();
    for (const delta of [{ step_index: -1 }, { step_index: 2.5 }, { step_index: Number.MAX_SAFE_INTEGER + 1 },
      { state: "BOGUS" }, { tool_name: "" }, { conversation_id: "other" }, { step_type: "agent_response" },
      { tool_name: "call_mcp_tool", tool_info: { parameters: { ToolName: "generate_image" } } },
      { tool_info: { parameters: [] } }, { tool_info: { parameters: "serialized" } }, { tool_info: {} },
      { tool_info: { name: "wrong", parameters: {} } }]) {
      const message = step(); if (message.event === "step_update") Object.assign(message.step_update, delta);
      expect(converter.getPendingNativeToolArgumentLookup(message)).toBeNull();
    }
    expect(() => converter.convert(step("BOGUS"))).toThrow("AGY_STREAM_INVALID_TOOL_STATE");
    const other = step(); if (other.event === "step_update") other.step_update.conversation_id = "other";
    expect(() => converter.convert(other)).toThrow("AGY_CONVERSATION_ID_CONFLICT");
    converter.interrupt();
    expect(converter.getPendingNativeToolArgumentLookup(step())).toBeNull();
  });

  it("keeps a cloned first native snapshot even if source objects or terminal summaries change", () => {
    const converter = setup();
    const args = { TargetFile: "/owned", TargetContent: "old\n", ReplacementContent: "new\n", AllowMultiple: false };
    const expected = structuredClone(args);
    const start = converter.convert(step(), args);
    args.ReplacementContent = "mutated after capture";
    const terminal = converter.convert(step("DONE", { TargetFile: "/different" }), { ReplacementContent: "too late" });
    expect(start[0]?.payload.arguments).toEqual(expected);
    expect(terminal[0]?.payload.arguments).toBe(start[0]?.payload.arguments);
    expect(terminal[0]?.payload.invocation_id).toBe(start[0]?.payload.invocation_id);
    expect(converter.convert(step("DONE"))).toEqual([]);
  });

  it("freezes summary fallback at STARTED and does not enrich only a terminal or background close", () => {
    const converter = setup(); const summary = { TargetFile: "/owned" };
    const start = converter.convert(step("ACTIVE", summary)); summary.TargetFile = "/changed";
    expect(converter.convert(step("DONE"), { TargetFile: "/owned", ReplacementContent: "too late" })[0]?.payload.arguments)
      .toEqual(start[0]?.payload.arguments);
    expect(start[0]?.payload.arguments).toEqual({ TargetFile: "/owned" });
    converter.convert(step("ACTIVE")); // already-terminal observation remains ignored
    expect(converter.convert({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } })
      .some((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED)).toBe(false);
  });

  it("ignores native resolution for an MCP wrapper and preserves native-image result authority", () => {
    const converter = setup(); const mcp = step("DONE", { ToolName: "open_tab", Arguments: { url: "https://example.com" } });
    if (mcp.event === "step_update") mcp.step_update.tool_name = "call_mcp_tool";
    expect(converter.convert(mcp, { injected: "must not attach" })[0]?.payload.arguments).not.toHaveProperty("injected");
    const image = new AgyStreamEventConverter("run", "conversation", "model", undefined,
      () => ({ path: "/owned/image.png", outputText: "image saved", reason: null }));
    image.startTurn("turn");
    const message = step("DONE", { ImageName: "dog" });
    if (message.event === "step_update") message.step_update.tool_name = "generate_image";
    const events = image.convert(message, { ImageName: "dog", Prompt: "typed native input" });
    expect(events[0]?.payload.arguments).toEqual({ ImageName: "dog", Prompt: "typed native input" });
    expect(events[1]?.payload.result).toEqual({ provider_state: "DONE", output: "image saved", file_path: "/owned/image.png" });
  });
});
