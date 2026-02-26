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

describe("Distributed team rerun rebootstrap integration", () => {
  it("re-bootstrap remote worker with memberBindings when team reruns after stop", async () => {
    const registry = new RunScopedTeamBindingRegistry();
    const envelopeBuilder = new EnvelopeBuilder();
    const handledKinds: string[] = [];

    const workerGateway = new RemoteMemberExecutionGateway({
      dispatchRunBootstrap: async (envelope) => {
        const payload = envelope.payload as {
          teamDefinitionId: string;
          memberBindings: any[];
        };
        handledKinds.push("RUN_BOOTSTRAP");
        registry.bindRun({
          teamRunId: envelope.teamRunId,
          teamId: "team-rerun",
          runVersion: envelope.runVersion,
          teamDefinitionId: payload.teamDefinitionId,
          runtimeTeamId: `worker-${envelope.teamRunId}`,
          memberBindings: payload.memberBindings,
        });
      },
      dispatchInterAgentMessage: async (envelope) => {
        handledKinds.push("INTER_AGENT_MESSAGE_REQUEST");
        registry.resolveRun(envelope.teamRunId);
      },
      dispatchControlStop: async (envelope) => {
        handledKinds.push("CONTROL_STOP");
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
      id: "def-rerun",
      name: "dist-team",
      description: "Distributed team rerun",
      coordinatorMemberName: "leader",
      nodes: [
        new TeamMember({
          memberName: "leader",
          referenceId: "agent-leader",
          referenceType: NodeType.AGENT,
          homeNodeId: "node-host",
        }),
        new TeamMember({
          memberName: "helper",
          referenceId: "agent-helper",
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
            teamId: "team-rerun",
            teamDefinitionId: input.teamDefinitionId,
            memberBindings: [
              {
                memberName: "helper",
                agentDefinitionId: "agent-helper",
                llmModelIdentifier: "gpt-4o-mini",
                autoExecuteTools: true,
                memberRouteKey: "helper",
                memberAgentId: "member_helper_remote",
                memoryDir: "/tmp/memory/agent_teams/team-rerun/member_helper_remote",
                workspaceId: "workspace-remote",
                llmConfig: { temperature: 0.1 },
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

    const run1 = orchestrator.startRunIfMissing({
      teamDefinition,
      hostNodeId: "node-host",
      nodeSnapshots: [
        { nodeId: "node-host", isHealthy: true },
        { nodeId: "node-worker-1", isHealthy: true },
      ],
      defaultNodeId: "node-host",
    });

    const dispatchRun1 = await orchestrator.dispatchInterAgentMessage(run1.teamRunId, {
      senderAgentId: "agent-leader",
      recipientName: "helper",
      content: "run1 message",
      messageType: "TASK_ASSIGNMENT",
    } as any);

    expect(dispatchRun1.accepted).toBe(true);
    expect(ensureRemoteNodeReady).toHaveBeenCalledTimes(1);
    const run1Binding = registry.resolveRun(run1.teamRunId);
    expect(run1Binding.memberBindings[0]).toMatchObject({
      memberName: "helper",
      memberRouteKey: "helper",
      memberAgentId: "member_helper_remote",
      memoryDir: "/tmp/memory/agent_teams/team-rerun/member_helper_remote",
      workspaceId: "workspace-remote",
    });

    const stopRun1 = await orchestrator.dispatchControlStop(run1.teamRunId);
    expect(stopRun1.accepted).toBe(true);
    expect(registry.tryResolveRun(run1.teamRunId)).toBeNull();

    const run2 = orchestrator.startRunIfMissing({
      teamDefinition,
      hostNodeId: "node-host",
      nodeSnapshots: [
        { nodeId: "node-host", isHealthy: true },
        { nodeId: "node-worker-1", isHealthy: true },
      ],
      defaultNodeId: "node-host",
    });
    expect(run2.teamRunId).not.toBe(run1.teamRunId);
    expect(Number(run2.runVersion)).toBeGreaterThan(Number(run1.runVersion));

    const dispatchRun2 = await orchestrator.dispatchInterAgentMessage(run2.teamRunId, {
      senderAgentId: "agent-leader",
      recipientName: "helper",
      content: "run2 message",
      messageType: "TASK_ASSIGNMENT",
    } as any);

    expect(dispatchRun2.accepted).toBe(true);
    expect(ensureRemoteNodeReady).toHaveBeenCalledTimes(2);
    const run2Binding = registry.resolveRun(run2.teamRunId);
    expect(run2Binding.memberBindings[0]).toMatchObject({
      memberName: "helper",
      memberRouteKey: "helper",
      memberAgentId: "member_helper_remote",
      memoryDir: "/tmp/memory/agent_teams/team-rerun/member_helper_remote",
      workspaceId: "workspace-remote",
    });

    expect(handledKinds).toEqual([
      "RUN_BOOTSTRAP",
      "INTER_AGENT_MESSAGE_REQUEST",
      "CONTROL_STOP",
      "RUN_BOOTSTRAP",
      "INTER_AGENT_MESSAGE_REQUEST",
    ]);
  });
});
