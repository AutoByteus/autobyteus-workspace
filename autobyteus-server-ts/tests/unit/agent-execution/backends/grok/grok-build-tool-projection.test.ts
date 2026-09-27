import { describe, expect, it } from "vitest";
import type { AcpToolCallSnapshot } from "../../../../../src/agent-execution/backends/acp/acp-agent-session-profile.js";
import { projectGrokToolCall } from "../../../../../src/agent-execution/backends/grok/grok-build-tool-projection.js";

const snapshot = (overrides: Partial<AcpToolCallSnapshot> & { name?: string }): AcpToolCallSnapshot => ({
  toolCallId: "call-1", title: "Display title", kind: "other", status: "pending",
  rawInput: {}, rawOutput: undefined, content: [], locations: [],
  meta: overrides.name ? { "x.ai/tool": { name: overrides.name, namespace: "grok_build" } } : null,
  ...overrides,
});

describe("projectGrokToolCall", () => {
  it("names tools from the stable Grok tool metadata, never the display title", () => {
    expect(projectGrokToolCall(snapshot({ name: "list_dir", title: "List `/tmp`", rawInput: { variant: "ListDir", target_directory: "/tmp" } })))
      .toEqual({ toolName: "list_dir", segmentType: "tool_call", arguments: { target_directory: "/tmp" } });
  });

  it("projects shell calls as run_bash with command arguments and exit-code failures", () => {
    const pending = snapshot({ name: "run_terminal_command", title: "Execute `ls`", rawInput: { variant: "Bash", command: "ls", description: "list" } });
    expect(projectGrokToolCall(pending)).toEqual({ toolName: "run_bash", segmentType: "run_bash", arguments: { command: "ls" } });
    expect(projectGrokToolCall({ ...pending, status: "completed", rawOutput: { output_for_prompt: "a\nb\n", exit_code: 0 } }))
      .toMatchObject({ result: "a\nb\n" });
    expect(projectGrokToolCall({ ...pending, status: "completed", rawOutput: { output_for_prompt: "boom\n", exit_code: 2 } }))
      .toMatchObject({ error: "boom\nExit code: 2" });
  });

  it("maps write and search_replace to write_file and edit_file with a file path", () => {
    expect(projectGrokToolCall(snapshot({ name: "write", rawInput: { file_path: "/w/a.txt", content: "x" } })))
      .toEqual({ toolName: "write_file", segmentType: "tool_call", arguments: { file_path: "/w/a.txt", content: "x" } });
    expect(projectGrokToolCall(snapshot({ name: "search_replace", rawInput: { old_string: "a", new_string: "b" }, locations: [{ path: "/w/b.txt" }] })))
      .toEqual({ toolName: "edit_file", segmentType: "tool_call", arguments: { old_string: "a", new_string: "b", file_path: "/w/b.txt" } });
  });

  it("shows use_tool calls under the canonical Agent Tools name with the MCP result projected", () => {
    const call = snapshot({ name: "use_tool", title: "use_tool", rawInput: {
      tool_name: "autobyteus_agent_tools__send_message_to", tool_input: { recipient_address: "/reviewer", content: "hi" } } });
    expect(projectGrokToolCall(call)).toEqual({
      toolName: "send_message_to", segmentType: "tool_call", arguments: { recipient_address: "/reviewer", content: "hi" },
    });
    expect(projectGrokToolCall({ ...call, status: "completed", rawOutput: {
      type: "MCP", tool_name: "send_message_to", output: { OkayOutput: "{\"accepted\":true}" } } }))
      .toMatchObject({ toolName: "send_message_to", result: { accepted: true } });
    expect(projectGrokToolCall({ ...call, status: "failed", rawOutput: { error: "recipient unknown" } }))
      .toMatchObject({ error: "recipient unknown" });
  });

  it("keeps search_tool and unknown built-ins visible under their own names", () => {
    expect(projectGrokToolCall(snapshot({ name: "search_tool", rawInput: { query: "q" } })).toolName).toBe("search_tool");
    expect(projectGrokToolCall(snapshot({ kind: "fetch" })).toolName).toBe("fetch");
    expect(projectGrokToolCall(snapshot({ kind: null })).toolName).toBe("unknown_tool");
  });
});
