import { describe, expect, it, vi } from "vitest";
import { EnvelopeBuilder } from "../../../src/distributed/envelope/envelope-builder.js";
import { HostNodeBridgeClient } from "../../../src/distributed/node-bridge/host-node-bridge-client.js";
import { WorkerNodeBridgeServer } from "../../../src/distributed/node-bridge/worker-node-bridge-server.js";
import { CommandRetryPolicy } from "../../../src/distributed/policies/command-retry-policy.js";
import { TeamRoutingPortAdapter } from "../../../src/distributed/routing/team-routing-port-adapter.js";
import { RemoteMemberExecutionGateway } from "../../../src/distributed/worker-execution/remote-member-execution-gateway.js";

describe("Distributed remote bootstrap integration", () => {
  it("bootstraps worker run once before first runtime envelope", async () => {
    const handledKinds: string[] = [];
    let bootstrapped = false;
    const workerGateway = new RemoteMemberExecutionGateway({
      dispatchRunBootstrap: async () => {
        handledKinds.push("RUN_BOOTSTRAP");
        bootstrapped = true;
      },
      dispatchInterAgentMessage: async () => {
        handledKinds.push("INTER_AGENT_MESSAGE_REQUEST");
        if (!bootstrapped) {
          throw new Error("runtime envelope received before bootstrap");
        }
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
    const envelopeBuilder = new EnvelopeBuilder();
    const ensureRemoteNodeReady = vi.fn(async (targetNodeId: string) => {
      await hostBridgeClient.sendCommand(
        targetNodeId,
        envelopeBuilder.buildEnvelope({
          teamRunId: "run-1",
          runVersion: 1,
          kind: "RUN_BOOTSTRAP",
          payload: {
            teamId: "team-remote-bootstrap",
            teamDefinitionId: "team-def-remote-bootstrap",
            memberBindings: [
              {
                memberName: "helper",
                agentDefinitionId: "agent-1",
                llmModelIdentifier: "gpt-4o-mini",
                autoExecuteTools: true,
              },
            ],
          },
        }),
      );
    });

    const adapter = new TeamRoutingPortAdapter({
      teamRunId: "run-1",
      runVersion: 1,
      localNodeId: "node-host",
      placementByMember: {
        helper: { memberName: "helper", nodeId: "node-worker-1", source: "required" },
      },
      ensureRemoteNodeReady,
      dispatchRemoteEnvelope: async (targetNodeId, envelope) => {
        await hostBridgeClient.sendCommand(targetNodeId, envelope);
      },
      dispatchLocalUserMessage: async () => undefined,
      dispatchLocalInterAgentMessage: async () => undefined,
      dispatchLocalToolApproval: async () => undefined,
    });

    const result = await adapter.dispatchInterAgentMessageRequest({
      senderAgentId: "agent-a",
      recipientName: "helper",
      content: "ping",
      messageType: "TASK_ASSIGNMENT",
    } as any);

    expect(result.accepted).toBe(true);
    expect(ensureRemoteNodeReady).toHaveBeenCalledTimes(1);
    expect(handledKinds).toEqual(["RUN_BOOTSTRAP", "INTER_AGENT_MESSAGE_REQUEST"]);
  });
});
