import { afterEach, describe, expect, it, vi } from "vitest";
import { generateStandaloneAgentRunId } from "../../../src/run-history/utils/agent-run-id-utils.js";

describe("agent-run-id-utils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the shared sanitized readable-id format for standalone AutoByteus runs", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(generateStandaloneAgentRunId("Xiaohongshu marketer", "Xiaohongshu marketer")).toBe(
      "xiaohongshu_marketer_1000",
    );
  });
});
