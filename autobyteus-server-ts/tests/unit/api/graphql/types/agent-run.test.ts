import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTerminationService = vi.hoisted(() => ({
  terminateAgentRun: vi.fn(),
  restoreAgentRun: vi.fn(),
}));

vi.mock(
  "../../../../../src/agent-execution/services/agent-run-service.js",
  () => ({
    getAgentRunService: () => mockTerminationService,
  }),
);

import { AgentRunManager } from "../../../../../src/agent-execution/services/agent-run-manager.js";
import {
  AgentRunResolver,
  type ApproveToolInvocationInput,
} from "../../../../../src/api/graphql/types/agent-run.js";

describe("AgentRunResolver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockTerminationService.terminateAgentRun.mockReset();
    mockTerminationService.restoreAgentRun.mockReset();
  });

  it("routes restore through AgentRunService", async () => {
    mockTerminationService.restoreAgentRun.mockResolvedValue({
      run: {
        runId: "run-restored-1",
      },
      metadata: {},
    });
    const resolver = new AgentRunResolver();

    const result = await resolver.restoreAgentRun("run-restored-1");

    expect(result).toEqual({
      success: true,
      message: "Agent run restored successfully.",
      runId: "run-restored-1",
    });
    expect(mockTerminationService.restoreAgentRun).toHaveBeenCalledWith("run-restored-1");
  });

  it("routes tool approval through the live AgentRun subject", async () => {
    const activeRun = {
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    };
    const agentRunManager = {
      getActiveRun: vi.fn().mockReturnValue(activeRun),
    };
    vi.spyOn(AgentRunManager, "getInstance").mockReturnValue(agentRunManager as never);
    const resolver = new AgentRunResolver();

    const result = await resolver.approveToolInvocation({
      agentRunId: "run-native-1",
      invocationId: "tool-1",
      isApproved: true,
      reason: null,
    } as ApproveToolInvocationInput);

    expect(result).toEqual({
      success: true,
      message: "Tool invocation approval/denial successfully sent to agent.",
    });
    expect(agentRunManager.getActiveRun).toHaveBeenCalledWith("run-native-1");
    expect(activeRun.approveToolInvocation).toHaveBeenCalledWith("tool-1", true, null);
  });
});
