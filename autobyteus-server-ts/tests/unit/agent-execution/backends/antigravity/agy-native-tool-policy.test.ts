import { describe, expect, it } from "vitest";
import { resolveAgyNativeToolProfile } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-native-tool-policy.js";

describe("AGY native custom-agent policy", () => {
  it("pins the exact E-048 eight native names without collaboration or MCP", () => {
    const names = resolveAgyNativeToolProfile("1.2.11").permittedNativeToolNames;
    expect(names).toEqual(["view_file", "write_to_file", "replace_file_content", "grep_search",
      "list_dir", "find_by_name", "run_command", "generate_image"]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("fails an unvalidated version rather than falling back to eight coding tools", () => {
    expect(() => resolveAgyNativeToolProfile("1.2.10")).toThrow("AGY_NATIVE_TOOL_PROFILE_UNSUPPORTED");
    expect(() => resolveAgyNativeToolProfile("1.2.12")).toThrow("AGY_NATIVE_TOOL_PROFILE_UNSUPPORTED");
  });
});
