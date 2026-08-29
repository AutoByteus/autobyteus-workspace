import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTerminationService = vi.hoisted(() => ({
  terminateAgentRun: vi.fn(),
  restoreAgentRun: vi.fn(),
  getAgentRun: vi.fn(),
}));
const mockRunModelConfigService = vi.hoisted(() => ({
  updateStoppedAgentRunModelConfig: vi.fn(),
}));

vi.mock(
  "../../../../../src/api/graphql/studio-application-api-services.js",
  () => ({
    getStudioAgentRunService: () => mockTerminationService,
    getStudioRunModelConfigService: () => mockRunModelConfigService,
  }),
);

import {
  AgentRunResolver,
  type ApproveToolInvocationInput,
} from "../../../../../src/api/graphql/types/agent-run.js";

describe("AgentRunResolver", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockTerminationService.terminateAgentRun.mockReset();
    mockTerminationService.restoreAgentRun.mockReset();
    mockTerminationService.getAgentRun.mockReset();
    mockRunModelConfigService.updateStoppedAgentRunModelConfig.mockReset();
  });

  it("routes only stopped model-config updates through the owner-aware Studio service", async () => {
    mockRunModelConfigService.updateStoppedAgentRunModelConfig.mockResolvedValue({
      success: false,
      outcome: "RUN_ACTIVE",
      message: "locked",
      isActive: true,
      editability: { editable: false, reason: "RUN_ACTIVE" },
      canonical: { llmConfig: { reasoning_effort: "medium" } },
      fieldErrors: [],
    });
    const resolver = new AgentRunResolver();

    await expect(resolver.updateStoppedAgentRunModelConfig({
      agentRunId: "run-1",
      llmConfig: { reasoning_effort: "high" },
    })).resolves.toMatchObject({
      outcome: "RUN_ACTIVE",
      canonicalLlmConfig: { reasoning_effort: "medium" },
    });
    expect(mockRunModelConfigService.updateStoppedAgentRunModelConfig).toHaveBeenCalledWith({
      agentRunId: "run-1",
      llmConfig: { reasoning_effort: "high" },
    });
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
    mockTerminationService.getAgentRun.mockReturnValue(activeRun);
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
    expect(mockTerminationService.getAgentRun).toHaveBeenCalledWith("run-native-1");
    expect(activeRun.approveToolInvocation).toHaveBeenCalledWith("tool-1", true, null);
  });
});
