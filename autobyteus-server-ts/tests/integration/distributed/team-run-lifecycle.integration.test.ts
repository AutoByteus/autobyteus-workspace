import { describe, expect, it, vi } from "vitest";
import type { TeamRoutingPort } from "autobyteus-ts";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { TeamRunOrchestrator } from "../../../src/distributed/team-run-orchestrator/team-run-orchestrator.js";

describe("Distributed team run lifecycle integration", () => {
  const buildDefinition = () =>
    new AgentTeamDefinition({
      id: "def-1",
      name: "dist-team",
      description: "Distributed",
      coordinatorMemberName: "leader",
      nodes: [
        new TeamMember({
          memberName: "leader",
          referenceId: "agent-1",
          referenceType: NodeType.AGENT,
          homeNodeId: "node-a",
        }),
        new TeamMember({
          memberName: "helper",
          referenceId: "agent-2",
          referenceType: NodeType.AGENT,
          homeNodeId: "node-b",
        }),
      ],
    });

  it("starts run, dispatches, degrades, and stops", async () => {
    const adapterCalls = {
      dispatchUserMessage: vi.fn(async () => ({ accepted: true })),
      dispatchInterAgentMessageRequest: vi.fn(async () => ({ accepted: true })),
      dispatchToolApproval: vi.fn(async () => ({ accepted: true })),
      dispatchControlStop: vi.fn(async () => ({ accepted: true })),
    };
    const adapter: TeamRoutingPort = adapterCalls;

    const orchestrator = new TeamRunOrchestrator({
      createRoutingAdapter: () => adapter,
    });

    const run = orchestrator.startRunIfMissing({
      teamDefinition: buildDefinition(),
      hostNodeId: "node-host",
      nodeSnapshots: [
        { nodeId: "node-a", isHealthy: true },
        { nodeId: "node-b", isHealthy: true },
      ],
      defaultNodeId: "node-a",
    });

    await orchestrator.dispatchInterAgentMessage(run.teamRunId, {
      senderAgentId: "agent-1",
      recipientName: "helper",
      content: "hello",
      messageType: "message",
    } as any);

    const degraded = orchestrator.markRunDegraded(run.teamRunId);
    expect(degraded?.status).toBe("degraded");

    const stopResult = await orchestrator.dispatchControlStop(run.teamRunId);
    expect(stopResult.accepted).toBe(true);
    expect(adapterCalls.dispatchInterAgentMessageRequest).toHaveBeenCalledTimes(1);
    expect(adapterCalls.dispatchControlStop).toHaveBeenCalledTimes(1);
    expect(orchestrator.getRunRecord(run.teamRunId)).toBeNull();
  });
});
