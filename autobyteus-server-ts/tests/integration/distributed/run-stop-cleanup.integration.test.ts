import { describe, expect, it, vi } from "vitest";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { EnvelopeBuilder } from "../../../src/distributed/envelope/envelope-builder.js";
import { HostNodeBridgeClient } from "../../../src/distributed/node-bridge/host-node-bridge-client.js";
import { WorkerNodeBridgeServer } from "../../../src/distributed/node-bridge/worker-node-bridge-server.js";
import { CommandRetryPolicy } from "../../../src/distributed/policies/command-retry-policy.js";
import { TeamRoutingPortAdapter } from "../../../src/distributed/routing/team-routing-port-adapter.js";
import { RunScopedTeamBindingRegistry } from "../../../src/distributed/runtime-binding/run-scoped-team-binding-registry.js";
import { TeamRunOrchestrator } from "../../../src/distributed/team-run-orchestrator/team-run-orchestrator.js";
import { RemoteMemberExecutionGateway } from "../../../src/distributed/worker-execution/remote-member-execution-gateway.js";

describe("Distributed run stop cleanup integration", () => {
  it("cleans host run state and worker run-scoped binding on control stop", async () => {
    const registry = new RunScopedTeamBindingRegistry();
    const envelopeBuilder = new EnvelopeBuilder();
    let workerStopCount = 0;

    const workerGateway = new RemoteMemberExecutionGateway({
      dispatchRunBootstrap: async (envelope) => {
        const payload = envelope.payload as {
          teamDefinitionId: string;
          memberBindings: any[];
        };
        registry.bindRun({
          teamRunId: envelope.teamRunId,
          teamId: "team-run-stop",
          runVersion: envelope.runVersion,
          teamDefinitionId: payload.teamDefinitionId,
          runtimeTeamId: "worker-team-1",
          memberBindings: payload.memberBindings,
        });
      },
      dispatchInterAgentMessage: async (envelope) => {
        registry.resolveRun(envelope.teamRunId);
      },
      dispatchControlStop: async (envelope) => {
        const binding = registry.tryResolveRun(envelope.teamRunId);
        if (!binding) {
          return;
        }
        workerStopCount += 1;
        registry.unbindRun(envelope.teamRunId);
      },
    });

    const workerServer = new WorkerNodeBridgeServer(async (envelope) => {
      await workerGateway.dispatchEnvelope(envelope);
    });

    const hostBridgeClient = new HostNodeBridgeClient({
      sendEnvelopeToWorker: async (_targetNodeId, envelope) => {
        await workerServer.handleCommand(envelope);
      },
      retryPolicy: new CommandRetryPolicy({
        maxAttempts: 2,
        jitterRatio: 0,
        sleep: async () => undefined,
      }),
    });

    const teamDefinition = new AgentTeamDefinition({
      id: "def-1",
      name: "dist-team",
      description: "Distributed team",
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

    const ensureRemoteNodeReady = vi.fn(async (input: {
      targetNodeId: string;
      teamRunId: string;
      runVersion: string | number;
      teamDefinitionId: string;
    }) => {
      await hostBridgeClient.sendCommand(
        input.targetNodeId,
        envelopeBuilder.buildEnvelope({
          teamRunId: input.teamRunId,
          runVersion: input.runVersion,
          kind: "RUN_BOOTSTRAP",
          payload: {
            teamId: "team-run-stop",
            teamDefinitionId: input.teamDefinitionId,
            memberBindings: [
              {
                memberName: "helper",
                agentDefinitionId: "agent-2",
                llmModelIdentifier: "gpt-4o-mini",
                autoExecuteTools: true,
              },
            ],
          },
        }),
      );
    });

    const orchestrator = new TeamRunOrchestrator({
      createRoutingAdapter: ({ teamRunId, teamDefinitionId, runVersion, hostNodeId, placementByMember }) =>
        new TeamRoutingPortAdapter({
          teamRunId,
          runVersion,
          localNodeId: hostNodeId,
          placementByMember,
          ensureRemoteNodeReady: async (targetNodeId) => {
            await ensureRemoteNodeReady({
              targetNodeId,
              teamRunId,
              runVersion,
              teamDefinitionId,
            });
          },
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

    const dispatchResult = await orchestrator.dispatchInterAgentMessage(run.teamRunId, {
      senderAgentId: "agent-1",
      recipientName: "helper",
      content: "prepare summary",
      messageType: "TASK_ASSIGNMENT",
    } as any);

    expect(dispatchResult.accepted).toBe(true);
    expect(ensureRemoteNodeReady).toHaveBeenCalledTimes(1);
    expect(registry.tryResolveRun(run.teamRunId)).toBeTruthy();

    const stopResult = await orchestrator.dispatchControlStop(run.teamRunId);

    expect(stopResult.accepted).toBe(true);
    expect(workerStopCount).toBe(1);
    expect(registry.tryResolveRun(run.teamRunId)).toBeNull();
    expect(orchestrator.getRunRecord(run.teamRunId)).toBeNull();
  });
});
