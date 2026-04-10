import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildReadableAgentIdStem,
  generateReadableAgentId,
} from "../../../../src/agent/factory/agent-id.js";

describe("agent-id", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deduplicates identical name and role segments", () => {
    expect(buildReadableAgentIdStem("Xiaohongshu marketer", "Xiaohongshu marketer")).toBe(
      "xiaohongshu_marketer",
    );
  });

  it("normalizes whitespace and punctuation into a folder-safe id", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(generateReadableAgentId(" Agent Name ", "Tool User")).toBe(
      "agent_name_tool_user_1000",
    );
  });
});
