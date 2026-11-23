import { describe, expect, it } from "vitest";
import { AgyStreamEventConverter } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import type { AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";

/** autobyteus-377: which finished native steps ask for the real result, and what the converter does with it. */
const step = (name: string, output: unknown, state = "DONE", extra: Record<string, unknown> = {}): AgyStreamMessage => ({ event: "step_update",
  step_update: { conversation_id: "conversation", step_index: 4, step_type: "tool", state, tool_name: name,
    tool_info: { parameters: { AbsolutePath: "/owned/a.txt" }, output, ...extra } } });
const setup = () => { const converter = new AgyStreamEventConverter("run", "conversation", "model"); converter.startTurn("turn"); return converter; };
const terminal = (events: ReturnType<AgyStreamEventConverter["convert"]>) =>
  events.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);

describe("AGY converter: native tool result lookup", () => {
  it.each([
    ["read_file", "12 lines, 340 bytes"], ["view_file", "1 lines, 9 bytes"], ["grep_search", "  3 lines, 77 bytes \n"],
    ["find_by_name", null], ["read_file", undefined], ["write_file", null], ["edit_file", null],
  ])("AC-001/002: a finished %s step with the stream result %j asks for its row", (name, output) => {
    expect(setup().getPendingNativeToolResultLookup(step(name, output))).toEqual({ stepIndex: 4, toolName: name });
  });

  it.each([
    ["run_command", "exit code 0\nreal output"], ["list_dir", "a.txt\nb.txt"], ["read_file", "a real result text"],
    ["read_file", "12 lines, 340 bytes of it"], ["read_file", { text: "x" }], ["read_file", ""],
  ])("AC-003: %s with a result already in the stream %j is not looked up", (name, output) => {
    expect(setup().getPendingNativeToolResultLookup(step(name, output))).toBeNull();
  });

  it("AC-003: only a finished, non-terminal, error-free native step of this conversation is looked up", () => {
    const converter = setup();
    for (const message of [step("read_file", null, "ACTIVE"), step("read_file", null, "ERROR"), step("read_file", null, "DONE", { error: "denied" }),
      step("generate_image", null), step("call_mcp_tool", null), step("read_file", null, "DONE", { name: "other" })]) {
      expect(converter.getPendingNativeToolResultLookup(message)).toBeNull();
    }
    const other = step("read_file", null); if (other.event === "step_update") other.step_update.conversation_id = "other";
    expect(converter.getPendingNativeToolResultLookup(other)).toBeNull();
    const agent = step("read_file", null); if (agent.event === "step_update") agent.step_update.step_type = "agent_response";
    expect(converter.getPendingNativeToolResultLookup(agent)).toBeNull();
    const negative = step("read_file", null); if (negative.event === "step_update") negative.step_update.step_index = -1;
    expect(converter.getPendingNativeToolResultLookup(negative)).toBeNull();
    expect(converter.getPendingNativeToolResultLookup({ event: "result", result: { conversation_id: "conversation", status: "SUCCESS" } })).toBeNull();
    // once the step is terminal, a repeated DONE does not ask again
    converter.convert(step("read_file", null));
    expect(converter.getPendingNativeToolResultLookup(step("read_file", null))).toBeNull();
    // outside a turn nothing is asked
    converter.interrupt();
    expect(converter.getPendingNativeToolResultLookup(step("read_file", null))).toBeNull();
  });

  it("AC-001: the recovered text becomes the success output; the arguments and the identity are unchanged", () => {
    const converter = setup();
    const events = converter.convert(step("read_file", "12 lines, 340 bytes"), { AbsolutePath: "/owned/a.txt" }, { text: "Showing lines 1-2 of 2\n1: a\n2: b" });
    expect(terminal(events)?.payload).toMatchObject({ tool_name: "read_file", arguments: { AbsolutePath: "/owned/a.txt" },
      provider_state: "DONE", result: { provider_state: "DONE", output: "Showing lines 1-2 of 2\n1: a\n2: b" } });
  });

  it("without a recovered text the stream's result stays exactly as before", () => {
    expect(terminal(setup().convert(step("read_file", "12 lines, 340 bytes")))?.payload.result)
      .toEqual({ provider_state: "DONE", output: "12 lines, 340 bytes" });
    expect(terminal(setup().convert(step("find_by_name", null), null, null))?.payload.result).toEqual({ provider_state: "DONE", output: null });
  });

  it("a recovered text never changes a failed step, an MCP result or an image result", () => {
    const failed = setup().convert(step("read_file", null, "ERROR", { error: "no such file" }), null, { text: "must not appear" });
    expect(failed.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_FAILED)?.payload.result)
      .toEqual({ provider_state: "ERROR", output: null });
    const mcp = step("call_mcp_tool", null);
    if (mcp.event === "step_update") mcp.step_update.tool_info = { parameters: { ToolName: "other_tool", Arguments: {} }, output: "mcp result" };
    expect(JSON.stringify(setup().convert(mcp, null, { text: "must not appear" }))).not.toContain("must not appear");
    const image = new AgyStreamEventConverter("run", "conversation", "model", undefined, () => ({ path: "/owned/i.png", outputText: "saved", reason: null }));
    image.startTurn("turn");
    expect(JSON.stringify(image.convert(step("generate_image", null), null, { text: "must not appear" }))).not.toContain("must not appear");
  });
});
