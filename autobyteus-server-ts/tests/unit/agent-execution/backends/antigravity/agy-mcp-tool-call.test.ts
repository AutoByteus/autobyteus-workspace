import { describe, expect, it } from "vitest";
import { AGY_MCP_CALL_TOOL_NAME, projectAgyMcpToolCall, projectAgyMcpToolOutput }
  from "../../../../../src/agent-execution/backends/antigravity/stream/agy-mcp-tool-call.js";

// Wrapper shapes are taken from the AGY 1.2.14 probe (tickets/.../agy-mcp-call-shape-probe/summary.json).
describe("AGY MCP tool call projection", () => {
  it("presents an AutoByteus agent tool under its bare canonical name with its own arguments", () => {
    expect(projectAgyMcpToolCall(AGY_MCP_CALL_TOOL_NAME, {
      Arguments: { description: "Do the work", recipient_address: "/worker" },
      ServerName: "autobyteus_agent_tools", ToolName: "delegate_task",
    })).toEqual({ toolName: "delegate_task", arguments: { description: "Do the work", recipient_address: "/worker" } });
  });

  it("presents a tool on another server as mcp__<server>__<tool> with the nested arguments", () => {
    expect(projectAgyMcpToolCall(AGY_MCP_CALL_TOOL_NAME, {
      Arguments: { note: "hello", options: { count: 2, tags: ["a", "b"] } },
      ServerName: "shape-test", ToolName: "echo_args",
    })).toEqual({ toolName: "mcp__shape-test__echo_args",
      arguments: { note: "hello", options: { count: 2, tags: ["a", "b"] } } });
  });

  it.each([
    ["empty", { Arguments: {}, ServerName: "shape-test", ToolName: "json_result" }],
    ["absent", { ServerName: "shape-test", ToolName: "json_result" }],
    ["not an object", { Arguments: "note=hello", ServerName: "shape-test", ToolName: "json_result" }],
  ])("presents %s Arguments as an empty object", (_label, parameters) => {
    expect(projectAgyMcpToolCall(AGY_MCP_CALL_TOOL_NAME, parameters))
      .toEqual({ toolName: "mcp__shape-test__json_result", arguments: {} });
  });

  it.each([
    ["missing ServerName", { ToolName: "generate_image", Arguments: {} }],
    ["blank ServerName", { ServerName: "  ", ToolName: "generate_image" }],
    ["missing ToolName", { ServerName: "autobyteus_agent_tools", Arguments: {} }],
    ["blank ToolName", { ServerName: "autobyteus_agent_tools", ToolName: "" }],
    ["non-string ToolName", { ServerName: "autobyteus_agent_tools", ToolName: 7 }],
    ["no parameters", null],
  ])("does not project a wrapper with %s", (_label, parameters) => {
    expect(projectAgyMcpToolCall(AGY_MCP_CALL_TOOL_NAME, parameters)).toBeNull();
  });

  it("does not project a native tool, even when its parameters look like the wrapper", () => {
    expect(projectAgyMcpToolCall("view_file", { AbsolutePath: "/tmp/a.json" })).toBeNull();
    expect(projectAgyMcpToolCall("run_command", { ServerName: "shape-test", ToolName: "echo_args" })).toBeNull();
  });
});

describe("AGY MCP tool output projection", () => {
  it("presents JSON object and array text as structured JSON", () => {
    expect(projectAgyMcpToolOutput("{\n  \"marker\": \"JSON-MARKER-4471\",\n  \"nested\": {\n    \"ok\": true\n  }\n}"))
      .toEqual({ marker: "JSON-MARKER-4471", nested: { ok: true } });
    expect(projectAgyMcpToolOutput("[1, {\"a\": 2}]")).toEqual([1, { a: 2 }]);
  });

  it.each([
    "ECHO:{\"note\": \"hello\", \"options\": {\"count\": 2, \"tags\": [\"a\", \"b\"]}}",
    "CAPSULE-MCP-MARKER-7318", "42", "true", "null", "\"quoted\"", "",
  ])("leaves other text unchanged (%j)", (text) => {
    expect(projectAgyMcpToolOutput(text)).toBe(text);
  });

  it("leaves non-text output unchanged", () => {
    const structured = { file_path: "/tmp/mcp.png" };
    expect(projectAgyMcpToolOutput(structured)).toBe(structured);
    expect(projectAgyMcpToolOutput(null)).toBeNull();
  });
});
