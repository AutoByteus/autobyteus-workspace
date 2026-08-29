import { describe, expect, it } from "vitest";
import {
  deriveAgentToolMcpRunSessionId,
  isAgentToolMcpRunSessionId,
} from "../../../../src/agent-tools/mcp/agent-tool-mcp-run-session-id.js";

describe("AgentToolMcpRunSessionId", () => {
  it.each([
    ["run-1", "agtrun_TmXT--itZTVoGwIbMHhbErbA4_iHiFmkFIs_WLiDXbA"],
    ["historical-run-1", "agtrun_wkRx76WaaI0Avi0OpyGWBfyS4EoD79K8J7OT3dGIJgA"],
    ["ümlaut-run", "agtrun_fH6MDV7CgmPEQkfkhM_z2bhGkQlAVeTo_qIYWbY7Rmw"],
  ])("derives the full SHA-256 base64url vector for %s", (runId, expected) => {
    expect(deriveAgentToolMcpRunSessionId(runId)).toBe(expected);
    expect(deriveAgentToolMcpRunSessionId(`  ${runId}  `)).toBe(expected);
    expect(expected).toHaveLength(50);
    expect(isAgentToolMcpRunSessionId(expected)).toBe(true);
  });

  it("rejects empty canonical input and malformed route IDs", () => {
    expect(() => deriveAgentToolMcpRunSessionId("   ")).toThrow("agentRunId is required");
    expect(isAgentToolMcpRunSessionId("agtrun_short")).toBe(false);
    expect(isAgentToolMcpRunSessionId("agtmcp_TmXT--itZTVoGwIbMHhbErbA4_iHiFmkFIs_WLiDXbA"))
      .toBe(false);
  });
});
