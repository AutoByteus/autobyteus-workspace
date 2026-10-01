import { describe, expect, it } from "vitest";
import { AGY_NATIVE_TOOL_NAMES } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-native-tool-policy.js";

describe("AGY native custom-agent policy", () => {
  it("declares the exact eight native names without collaboration or MCP", () => {
    const names = AGY_NATIVE_TOOL_NAMES;
    expect(names).toEqual(["view_file", "write_to_file", "replace_file_content", "grep_search",
      "list_dir", "find_by_name", "run_command", "generate_image"]);
    expect(new Set(names).size).toBe(names.length);
  });

});
