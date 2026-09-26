import { describe, expect, it } from "vitest";
import { resolveAgyNativeToolProfile } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-native-tool-policy.js";

describe("AGY native custom-agent policy", () => {
  it("pins image, coding, web, browser and interaction names without collaboration or MCP", () => {
    const names = resolveAgyNativeToolProfile("1.2.11").permittedNativeToolNames;
    expect(names).toEqual(expect.arrayContaining(["generate_image", "view_file", "run_command",
      "search_web", "read_url_content", "browser_click_element", "ask_question", "schedule"]));
    expect(names).not.toEqual(expect.arrayContaining(["invoke_subagent", "define_subagent",
      "manage_subagents", "browser_subagent", "send_message", "manage_inbox", "call_mcp_tool"]));
    expect(new Set(names).size).toBe(names.length);
  });

  it("fails an unvalidated version rather than falling back to eight coding tools", () => {
    expect(() => resolveAgyNativeToolProfile("1.2.10")).toThrow("AGY_NATIVE_TOOL_PROFILE_UNSUPPORTED");
    expect(() => resolveAgyNativeToolProfile("1.2.12")).toThrow("AGY_NATIVE_TOOL_PROFILE_UNSUPPORTED");
  });
});
