import { describe, expect, it, vi } from "vitest";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { HostNodeBridgeClient } from "../../../src/distributed/node-bridge/host-node-bridge-client.js";
import { CommandRetryPolicy } from "../../../src/distributed/policies/command-retry-policy.js";
import { RunDegradationPolicy } from "../../../src/distributed/policies/run-degradation-policy.js";
import { TeamRoutingPortAdapter } from "../../../src/distributed/routing/team-routing-port-adapter.js";
import { TeamRunOrchestrator } from "../../../src/distributed/team-run-orchestrator/team-run-orchestrator.js";

describe("Distributed retry/degrade integration", () => {
  it("auto-stops the run after repeated coordinator route failures through routing adapter", async () => {
    const sendEnvelopeToWorker = vi.fn(async (_targetNodeId: string, envelope: { kind: string }) => {
      if (envelope.kind === "CONTROL_STOP") {
        return;
      }
      throw new Error("route timeout");
    });
    const retrySleep = vi.fn(async () => undefined);
    const hostBridgeClient = new HostNodeBridgeClient({
      sendEnvelopeToWorker,
      retryPolicy: new CommandRetryPolicy({
        maxAttempts: 3,
        jitterRatio: 0,
        sleep: retrySleep,
      }),
    });

    const teamDefinition = new AgentTeamDefinition({
      id: "def-1",
      name: "distributed-team",
      description: "retry/degrade",
      coordinatorMemberName: "coordinator",
      nodes: [
        new TeamMember({
          memberName: "coordinator",
          referenceId: "agent-1",
          referenceType: NodeType.AGENT,
          homeNodeId: "node-worker-1",
        }),
      ],
    });

    const orchestrator = new TeamRunOrchestrator({
      runDegradationPolicy: new RunDegradationPolicy({
        coordinatorFailureThreshold: 1,
        globalFailureThreshold: 100,
        globalFailureWindowMs: 60_000,
      }),
      createRoutingAdapter: ({ teamRunId, runVersion, hostNodeId, placementByMember }) =>
        new TeamRoutingPortAdapter({
          teamRunId,
          runVersion,
          localNodeId: hostNodeId,
          placementByMember,
          dispatchRemoteEnvelope: async (targetNodeId, envelope) => {
            await hostBridgeClient.sendCommand(targetNodeId, envelope);
          },
          dispatchLocalUserMessage: async () => undefined,
          dispatchLocalInterAgentMessage: async () => undefined,
          dispatchLocalToolApproval: async () => undefined,
          dispatchLocalControlStop: async () => undefined,
        }),
    });

    const run = orchestrator.startRunIfMissing({
      teamDefinition,
      hostNodeId: "node-host",
      nodeSnapshots: [
        { nodeId: "node-host", isHealthy: true },
        { nodeId: "node-worker-1", isHealthy: true },
      ],
      defaultNodeId: "node-host",
    });

    const firstFailure = await orchestrator.dispatchUserMessage(run.teamRunId, {
      targetAgentName: "coordinator",
      userMessage: { content: "hello" },
    } as any);
    expect(firstFailure.accepted).toBe(false);
    expect(orchestrator.getRunRecord(run.teamRunId)?.status).toBe("degraded");

    const secondFailure = await orchestrator.dispatchUserMessage(run.teamRunId, {
      targetAgentName: "coordinator",
      userMessage: { content: "retry" },
    } as any);
    expect(secondFailure.accepted).toBe(false);
    expect(secondFailure.errorCode).toBe("RUN_AUTO_STOPPED");
    expect(orchestrator.getRunRecord(run.teamRunId)).toBeNull();

    expect(sendEnvelopeToWorker).toHaveBeenCalledTimes(7);
    expect(retrySleep).toHaveBeenCalledTimes(4);
  });
});
