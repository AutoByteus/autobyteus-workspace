import { describe, expect, it } from "vitest";
import {
  generateAgentRunIdForDefinitionName,
  normalizeIdentityNameSlug,
  normalizeStoredAgentRunId,
} from "../../../src/agent-execution/identity/agent-run-id.js";

describe("agent-run-id", () => {
  it("normalizes definition names to readable lowercase run-id slugs", () => {
    expect(normalizeIdentityNameSlug("  Xiaohongshu marketer / Agent #1  ")).toBe(
      "xiaohongshu_marketer_agent_1",
    );
  });

  it("falls back to agent slug when definition name has no usable characters", () => {
    expect(normalizeIdentityNameSlug("!!!")).toBe("agent");
  });

  it("combines the definition-name slug with a UUID token", () => {
    expect(
      generateAgentRunIdForDefinitionName(
        "Live AutoByteus Backend Agent",
        "0123456789abcdef0123456789abcdef",
      ),
    ).toBe("live_autobyteus_backend_agent_0123456789abcdef0123456789abcdef");
  });

  it("normalizes stored IDs but rejects blanks", () => {
    expect(normalizeStoredAgentRunId("  historical-run-1  ")).toBe("historical-run-1");
    expect(() => normalizeStoredAgentRunId("   ")).toThrow("agentRunId is required");
  });
});
