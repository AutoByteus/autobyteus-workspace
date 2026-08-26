import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { StudioRunModelConfigService } from "../../../../src/run-history/services/studio-run-model-config-service.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const applicationBinding = Object.freeze({ applicationId: "app-1", bindingId: "binding-1" });
const editable = Object.freeze({ editable: true, reason: null });
const agentResume = Object.freeze({
  runId: "agent-run-1",
  isActive: false,
  metadataConfig: {
    runId: "agent-run-1",
    agentDefinitionId: "agent-def-1",
    workspaceRootPath: "/workspace",
    memoryDir: "/memory",
    llmModelIdentifier: "model-1",
    llmConfig: { reasoning_effort: "medium" },
    autoExecuteTools: true,
    skillAccessMode: null,
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    platformAgentRunId: null,
    applicationExecutionContext: {
      ...applicationBinding,
      producer: {
        agentRunId: "agent-run-1",
        displayName: "Agent",
        runtimeKind: "AGENT" as const,
      },
    },
    runtimeReference: {
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      sessionId: null,
      threadId: null,
      metadata: null,
    },
  },
  modelConfigEditability: editable,
});
const baseTree = testExecutionTree({
  rootTeamRunId: "team-run-1",
  rootTeamDefinitionId: "team-def-1",
  teamDefinitionName: "Team",
  coordinatorAddress: "/coordinator",
  children: [testAgentNode("/coordinator")],
});
const teamTree = Object.freeze({ ...baseTree, applicationBinding });
const teamResume = Object.freeze({
  teamRunId: "team-run-1",
  isActive: false,
  executionTree: teamTree,
  modelConfigEditability: editable,
});

const harness = () => {
  const hasLiveRunOwnership = vi.fn(async () => false);
  const getAgentRunResumeConfig = vi.fn(async () => agentResume);
  const getTeamRunResumeConfig = vi.fn(async () => teamResume);
  const updateStoppedModelConfig = vi.fn(async () => ({ subject: "agent-general" }));
  const updateStoppedModelConfigs = vi.fn(async () => ({ subject: "team-general" }));
  return {
    hasLiveRunOwnership,
    getAgentRunResumeConfig,
    getTeamRunResumeConfig,
    updateStoppedModelConfig,
    updateStoppedModelConfigs,
    service: new StudioRunModelConfigService({
      applicationRunOwnership: { hasLiveRunOwnership },
      agentResumeConfigService: { getAgentRunResumeConfig },
      teamResumeConfigService: { getTeamRunResumeConfig },
      agentRunService: { updateStoppedModelConfig } as never,
      teamRunService: { updateStoppedModelConfigs } as never,
    }),
  };
};

describe("StudioRunModelConfigService", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("overlays Application-owned Agent and Team reads with the existing active lock", async () => {
    const agent = harness();
    agent.hasLiveRunOwnership.mockResolvedValue(true);
    await expect(agent.service.getAgentRunResumeConfig("agent-run-1")).resolves.toEqual({
      ...agentResume,
      isActive: true,
      modelConfigEditability: { editable: false, reason: "RUN_ACTIVE" },
    });
    expect(agent.hasLiveRunOwnership).toHaveBeenCalledWith({
      runId: "agent-run-1",
      applicationBinding: agentResume.metadataConfig.applicationExecutionContext,
    });

    const team = harness();
    team.hasLiveRunOwnership.mockResolvedValue(true);
    await expect(team.service.getTeamRunResumeConfig("team-run-1")).resolves.toEqual({
      ...teamResume,
      isActive: true,
      modelConfigEditability: { editable: false, reason: "RUN_ACTIVE" },
    });
    expect(team.hasLiveRunOwnership).toHaveBeenCalledWith({
      runId: "team-run-1",
      applicationBinding,
    });
  });

  it("returns unchanged General read results after Application release", async () => {
    const { service } = harness();
    await expect(service.getAgentRunResumeConfig("agent-run-1")).resolves.toBe(agentResume);
    await expect(service.getTeamRunResumeConfig("team-run-1")).resolves.toBe(teamResume);
  });

  it("rejects Application-owned Agent and Team updates with canonical state and zero General write", async () => {
    const agent = harness();
    agent.hasLiveRunOwnership.mockResolvedValue(true);
    const agentInput = { agentRunId: "agent-run-1", llmConfig: { reasoning_effort: "high" } };
    await expect(agent.service.updateStoppedAgentRunModelConfig(agentInput)).resolves.toMatchObject({
      success: false,
      outcome: "RUN_ACTIVE",
      isActive: true,
      editability: { editable: false, reason: "RUN_ACTIVE" },
      canonical: { runId: "agent-run-1", llmConfig: { reasoning_effort: "medium" } },
    });
    expect(agent.updateStoppedModelConfig).not.toHaveBeenCalled();

    const team = harness();
    team.hasLiveRunOwnership.mockResolvedValue(true);
    const teamInput = {
      teamRunId: "team-run-1",
      patches: [{ scopeKind: "CONFIGURED_TEAM" as const, scopeAddress: "/", llmConfig: null }],
    };
    await expect(team.service.updateStoppedTeamRunModelConfigs(teamInput)).resolves.toMatchObject({
      success: false,
      outcome: "RUN_ACTIVE",
      isActive: true,
      canonical: teamTree,
    });
    expect(team.updateStoppedModelConfigs).not.toHaveBeenCalled();
  });

  it("delegates exact updates to unchanged General facades only after release", async () => {
    const agent = harness();
    const agentInput = { agentRunId: "agent-run-1", llmConfig: null };
    await expect(agent.service.updateStoppedAgentRunModelConfig(agentInput))
      .resolves.toEqual({ subject: "agent-general" });
    expect(agent.updateStoppedModelConfig).toHaveBeenCalledWith(agentInput);

    const team = harness();
    const teamInput = {
      teamRunId: "team-run-1",
      patches: [{ scopeKind: "CONFIGURED_AGENT" as const, scopeAddress: "/coordinator", llmConfig: null }],
    };
    await expect(team.service.updateStoppedTeamRunModelConfigs(teamInput))
      .resolves.toEqual({ subject: "team-general" });
    expect(team.updateStoppedModelConfigs).toHaveBeenCalledWith(teamInput);
  });

  it("fails reads closed and returns INTERNAL_ERROR/no write when ownership is unreadable", async () => {
    const reads = harness();
    reads.hasLiveRunOwnership.mockRejectedValue(new Error("binding database unavailable"));
    await expect(reads.service.getAgentRunResumeConfig("agent-run-1"))
      .rejects.toThrow("binding database unavailable");

    const agent = harness();
    agent.hasLiveRunOwnership.mockRejectedValue(new Error("binding database unavailable"));
    await expect(agent.service.updateStoppedAgentRunModelConfig({
      agentRunId: "agent-run-1",
      llmConfig: null,
    })).resolves.toMatchObject({
      success: false,
      outcome: "INTERNAL_ERROR",
      editability: { editable: false, reason: "INTERNAL_ERROR" },
      canonical: { runId: "agent-run-1" },
    });
    expect(agent.updateStoppedModelConfig).not.toHaveBeenCalled();

    const team = harness();
    team.hasLiveRunOwnership.mockRejectedValue(new Error("binding database unavailable"));
    await expect(team.service.updateStoppedTeamRunModelConfigs({
      teamRunId: "team-run-1",
      patches: [],
    })).resolves.toMatchObject({
      success: false,
      outcome: "INTERNAL_ERROR",
      canonical: teamTree,
    });
    expect(team.updateStoppedModelConfigs).not.toHaveBeenCalled();
  });
});
