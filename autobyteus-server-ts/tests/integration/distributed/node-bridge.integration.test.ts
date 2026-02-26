import { describe, expect, it } from "vitest";
import { EnvelopeBuilder } from "../../../src/distributed/envelope/envelope-builder.js";
import { HostNodeBridgeClient } from "../../../src/distributed/node-bridge/host-node-bridge-client.js";
import { WorkerNodeBridgeServer } from "../../../src/distributed/node-bridge/worker-node-bridge-server.js";
import { CommandRetryPolicy } from "../../../src/distributed/policies/command-retry-policy.js";
import { RemoteMemberExecutionGateway } from "../../../src/distributed/worker-execution/remote-member-execution-gateway.js";

describe("Node bridge integration", () => {
  it("delivers envelope through host client into worker execution gateway once (deduped)", async () => {
    const envelope = new EnvelopeBuilder().buildEnvelope({
      envelopeId: "env-1",
      teamRunId: "run-1",
      runVersion: 1,
      kind: "INTER_AGENT_MESSAGE_REQUEST",
      payload: { content: "hello" },
    });

    const handledEnvelopeIds: string[] = [];
    const publishedEvents: string[] = [];
    const executionGateway = new RemoteMemberExecutionGateway({
      dispatchInterAgentMessage: async (incomingEnvelope) => {
        handledEnvelopeIds.push(incomingEnvelope.envelopeId);
      },
      publishEventToHost: async (event) => {
        publishedEvents.push(`${event.sourceNodeId}:${event.eventType}`);
      },
    });
    const workerServer = new WorkerNodeBridgeServer(async (incomingEnvelope) => {
      await executionGateway.dispatchEnvelope(incomingEnvelope);
    });

    const hostClient = new HostNodeBridgeClient({
      sendEnvelopeToWorker: async (_targetNodeId, outgoingEnvelope) => {
        await workerServer.handleCommand(outgoingEnvelope);
      },
      retryPolicy: new CommandRetryPolicy({
        maxAttempts: 2,
        jitterRatio: 0,
        sleep: async () => undefined,
      }),
    });

    await hostClient.sendCommand("node-worker-1", envelope);
    await hostClient.sendCommand("node-worker-1", envelope);
    await executionGateway.emitMemberEvent({
      teamRunId: "run-1",
      runVersion: 1,
      sourceNodeId: "node-worker-1",
      sourceEventId: "evt-1",
      memberName: "helper",
      eventType: "TOOL_EXECUTION_SUCCEEDED",
      payload: { invocation_id: "inv-1" },
    });

    expect(handledEnvelopeIds).toEqual(["env-1"]);
    expect(publishedEvents).toEqual(["node-worker-1:TOOL_EXECUTION_SUCCEEDED"]);
  });
});
