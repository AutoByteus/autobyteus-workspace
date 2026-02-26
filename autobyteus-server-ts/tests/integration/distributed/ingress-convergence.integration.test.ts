import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { TeamCommandIngressService } from "../../../src/distributed/ingress/team-command-ingress-service.js";
import { TeamRunLocator } from "../../../src/distributed/ingress/team-run-locator.js";
import { TeamRunOrchestrator } from "../../../src/distributed/team-run-orchestrator/team-run-orchestrator.js";

const buildDefinition = () =>
  new AgentTeamDefinition({
    id: "def-1",
    name: "distributed-team",
    description: "distributed",
    coordinatorMemberName: "leader",
    nodes: [
        new TeamMember({
          memberName: "leader",
          referenceId: "agent-1",
          referenceType: NodeType.AGENT,
          homeNodeId: "node-host",
        }),
        new TeamMember({
          memberName: "helper",
          referenceId: "agent-2",
          referenceType: NodeType.AGENT,
          homeNodeId: "node-worker-1",
        }),
    ],
  });

const createHarness = () => {
  const dispatchUserMessage = vi.fn(async () => ({ accepted: true }));
  const dispatchInterAgentMessageRequest = vi.fn(async () => ({ accepted: true }));
  const dispatchToolApproval = vi.fn(async () => ({ accepted: true }));

  const orchestrator = new TeamRunOrchestrator({
    createRoutingAdapter: () => ({
      dispatchUserMessage,
      dispatchInterAgentMessageRequest,
      dispatchToolApproval,
      dispatchControlStop: vi.fn(async () => ({ accepted: true })),
    }),
  });

  const teamDefinition = buildDefinition();
  const locator = new TeamRunLocator({
    teamRunOrchestrator: orchestrator,
    teamDefinitionService: {
      getDefinitionById: vi.fn(async (id: string) => (id === "def-1" ? teamDefinition : null)),
    } as any,
    teamRunManager: {
      getTeamRun: vi.fn((teamId: string) => (teamId === "team-1" ? { teamId } : null)),
      getTeamDefinitionId: vi.fn((teamId: string) => (teamId === "team-1" ? "def-1" : null)),
      getTeamMemberNames: vi.fn((teamId: string) => (teamId === "team-1" ? ["leader", "helper"] : [])),
    },
    hostNodeId: "node-host",
    defaultNodeId: "node-host",
    nodeSnapshotProvider: () => [
      { nodeId: "node-host", isHealthy: true, supportsAgentExecution: true },
      { nodeId: "node-worker-1", isHealthy: true, supportsAgentExecution: true },
    ],
  });

  const ingress = new TeamCommandIngressService({
    teamRunLocator: locator,
    teamRunOrchestrator: orchestrator,
  });

  return {
    ingress,
    dispatchUserMessage,
    dispatchInterAgentMessageRequest,
    dispatchToolApproval,
  };
};

describe("Distributed ingress convergence integration", () => {
  it("routes user/inter-agent/tool-approval commands through one run identity", async () => {
    const {
      ingress,
      dispatchUserMessage,
      dispatchInterAgentMessageRequest,
      dispatchToolApproval,
    } = createHarness();

    const firstResult = await ingress.dispatchUserMessage({
      teamId: "team-1",
      userMessage: AgentInputUserMessage.fromDict({
        content: "hello",
        context_files: null,
      }),
      targetMemberName: null,
    });
    const secondResult = await ingress.dispatchUserMessage({
      teamId: "team-1",
      userMessage: AgentInputUserMessage.fromDict({
        content: "to-helper",
        context_files: null,
      }),
      targetMemberName: "helper",
    });

    expect(firstResult.teamRunId).toBe(secondResult.teamRunId);
    expect(firstResult.runVersion).toBe(secondResult.runVersion);
    expect(dispatchUserMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ targetAgentName: "leader" }),
    );
    expect(dispatchUserMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ targetAgentName: "helper" }),
    );

    await ingress.dispatchInterAgentMessage({
      teamId: "team-1",
      event: {
        senderAgentId: "agent-1",
        recipientName: "helper",
        content: "sync status",
        messageType: "TASK_ASSIGNMENT",
      } as any,
    });
    expect(dispatchInterAgentMessageRequest).toHaveBeenCalledTimes(1);

    const token = await ingress.issueToolApprovalToken({
      teamId: "team-1",
      invocationId: "inv-1",
      targetMemberName: "helper",
      invocationVersion: 1,
    });
    const approvalResult = await ingress.dispatchToolApproval({
      teamId: "team-1",
      token,
      isApproved: true,
      reason: "ok",
      agentName: "helper",
    });

    expect(approvalResult.teamRunId).toBe(firstResult.teamRunId);
    expect(dispatchToolApproval).toHaveBeenCalledTimes(1);
  });
});
