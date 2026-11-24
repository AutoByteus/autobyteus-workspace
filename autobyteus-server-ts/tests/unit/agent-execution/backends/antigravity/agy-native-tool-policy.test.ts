import { describe, expect, it } from "vitest";
import { AGY_NATIVE_TOOL_NAMES, agyNativeToolsMissingFromRegistry } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-native-tool-policy.js";

describe("AGY native custom-agent policy", () => {
  it("declares the exact eight registry names, once each, without collaboration or MCP", () => {
    expect(AGY_NATIVE_TOOL_NAMES).toEqual(["view_file", "write_to_file", "replace_file_content", "grep_search",
      "list_dir", "find_by_name", "run_command", "generate_image"]);
    expect(new Set(AGY_NATIVE_TOOL_NAMES).size).toBe(AGY_NATIVE_TOOL_NAMES.length);
    expect(AGY_NATIVE_TOOL_NAMES).not.toContain("call_mcp_tool");
  });

  it("never lists the names the model is shown for three of them: naming both a name and its alias does not start (autobyteus-588)", () => {
    for (const alias of ["read_file", "write_file", "edit_file"]) expect(AGY_NATIVE_TOOL_NAMES as readonly string[]).not.toContain(alias);
  });

  it("reports the names a start message's registry lacks, and nothing when it has no registry array", () => {
    expect(agyNativeToolsMissingFromRegistry([...AGY_NATIVE_TOOL_NAMES, "manage_task"])).toEqual([]);
    expect(agyNativeToolsMissingFromRegistry(["view_file", "run_command"])).toEqual(
      ["write_to_file", "replace_file_content", "grep_search", "list_dir", "find_by_name", "generate_image"]);
    for (const none of [undefined, null, "view_file", {}]) expect(agyNativeToolsMissingFromRegistry(none)).toEqual([]);
  });
});
