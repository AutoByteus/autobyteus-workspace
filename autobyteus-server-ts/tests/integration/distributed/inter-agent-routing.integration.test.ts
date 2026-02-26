import { describe, expect, it, vi } from "vitest";
import { EnvelopeBuilder } from "../../../src/distributed/envelope/envelope-builder.js";
import { HostNodeBridgeClient } from "../../../src/distributed/node-bridge/host-node-bridge-client.js";
import { WorkerNodeBridgeServer } from "../../../src/distributed/node-bridge/worker-node-bridge-server.js";
import { CommandRetryPolicy } from "../../../src/distributed/policies/command-retry-policy.js";
import { TeamRoutingPortAdapter } from "../../../src/distributed/routing/team-routing-port-adapter.js";

describe("Distributed inter-agent routing integration", () => {
  it("routes remote inter-agent messages via host bridge into worker handler", async () => {
    const handledEnvelopes: Array<{ kind: string; payload: unknown }> = [];
    const workerServer = new WorkerNodeBridgeServer(async (envelope) => {
      handledEnvelopes.push({ kind: envelope.kind, payload: envelope.payload });
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

    const localInterAgentDispatch = vi.fn(async () => undefined);
    const adapter = new TeamRoutingPortAdapter({
      teamRunId: "run-1",
      runVersion: 1,
      localNodeId: "node-host",
      placementByMember: {
        helper: { memberName: "helper", nodeId: "node-worker-1", source: "preferred" },
      },
      dispatchRemoteEnvelope: async (targetNodeId, envelope) => {
        await hostBridgeClient.sendCommand(targetNodeId, envelope);
      },
      dispatchLocalUserMessage: vi.fn(async () => undefined),
      dispatchLocalInterAgentMessage: localInterAgentDispatch,
      dispatchLocalToolApproval: vi.fn(async () => undefined),
      envelopeBuilder: new EnvelopeBuilder(),
    });

    const result = await adapter.dispatchInterAgentMessageRequest({
      senderAgentId: "agent-a",
      recipientName: "helper",
      content: "please summarize",
      messageType: "TASK_ASSIGNMENT",
    } as any);

    expect(result.accepted).toBe(true);
    expect(localInterAgentDispatch).not.toHaveBeenCalled();
    expect(handledEnvelopes).toHaveLength(1);
    expect(handledEnvelopes[0]?.kind).toBe("INTER_AGENT_MESSAGE_REQUEST");
  });
});
