import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TeamEnvelope } from "../../../src/distributed/envelope/envelope-builder.js";
import { TeamEventAggregator } from "../../../src/distributed/event-aggregation/team-event-aggregator.js";
import { WorkerNodeBridgeServer } from "../../../src/distributed/node-bridge/worker-node-bridge-server.js";
import { NodeDirectoryService } from "../../../src/distributed/node-directory/node-directory-service.js";
import { TeamRoutingPortAdapter } from "../../../src/distributed/routing/team-routing-port-adapter.js";
import { InternalEnvelopeAuth } from "../../../src/distributed/security/internal-envelope-auth.js";
import { registerHostDistributedEventRoutes } from "../../../src/distributed/transport/internal-http/register-host-distributed-event-routes.js";
import { registerWorkerDistributedCommandRoutes } from "../../../src/distributed/transport/internal-http/register-worker-distributed-command-routes.js";
import { HostDistributedCommandClient } from "../../../src/distributed/transport/internal-http/host-distributed-command-client.js";
import { WorkerEventUplinkClient } from "../../../src/distributed/transport/internal-http/worker-event-uplink-client.js";

const waitForCondition = async (fn: () => boolean, timeoutMs = 2000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for condition.");
};

describe("Cross-node message roundtrip integration", () => {
  const openApps: Array<ReturnType<typeof fastify>> = [];

  afterEach(async () => {
    for (const app of openApps.splice(0)) {
      await app.close();
    }
  });

  it("routes remote inter-agent messages and uplinks remote replies back to host", async () => {
    const now = 1_700_000_000_000;
    const secret = "shared-secret";
    const teamRunId = "run-cross-node-1";
    const runVersion = 7;
    const workerHandledEnvelopes: TeamEnvelope[] = [];
    const hostAggregatedEvents: unknown[] = [];

    const hostApp = fastify();
    openApps.push(hostApp);
    const workerApp = fastify();
    openApps.push(workerApp);

    const hostAuth = new InternalEnvelopeAuth({
      localNodeId: "node-host",
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: ["node-worker"],
      now: () => now,
    });
    const workerAuth = new InternalEnvelopeAuth({
      localNodeId: "node-worker",
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: ["node-host"],
      now: () => now,
    });

    await registerHostDistributedEventRoutes(hostApp, {
      teamEventAggregator: new TeamEventAggregator({
        publishSink: (event) => hostAggregatedEvents.push(event),
      }),
      internalEnvelopeAuth: hostAuth,
      securityMode: "strict_signed",
    });

    let workerUplinkClient: WorkerEventUplinkClient | null = null;
    await registerWorkerDistributedCommandRoutes(workerApp, {
      workerNodeBridgeServer: new WorkerNodeBridgeServer(async (envelope) => {
        workerHandledEnvelopes.push(envelope);
        if (envelope.kind !== "INTER_AGENT_MESSAGE_REQUEST") {
          return;
        }
        if (!workerUplinkClient) {
          throw new Error("Worker uplink client is not initialized.");
        }
        const payload = envelope.payload as {
          recipientName: string;
          content: string;
        };
        await workerUplinkClient.publishRemoteEvent({
          teamRunId: envelope.teamRunId,
          runVersion: envelope.runVersion,
          sourceNodeId: "node-worker",
          sourceEventId: "evt-roundtrip-1",
          memberName: payload.recipientName,
          agentRunId: "member-student-remote",
          eventType: "AGENT_REPLY",
          payload: {
            content: `ack:${payload.content}`,
          },
        });
      }),
      internalEnvelopeAuth: workerAuth,
      securityMode: "strict_signed",
    });

    await hostApp.listen({ host: "127.0.0.1", port: 0 });
    await workerApp.listen({ host: "127.0.0.1", port: 0 });
    const hostAddress = hostApp.server.address();
    const workerAddress = workerApp.server.address();
    if (!hostAddress || typeof hostAddress === "string") {
      throw new Error("Host server address is unavailable.");
    }
    if (!workerAddress || typeof workerAddress === "string") {
      throw new Error("Worker server address is unavailable.");
    }

    const nodeDirectoryService = new NodeDirectoryService([
      {
        nodeId: "node-host",
        baseUrl: `http://127.0.0.1:${hostAddress.port}`,
        isHealthy: true,
        supportsAgentExecution: true,
      },
      {
        nodeId: "node-worker",
        baseUrl: `http://127.0.0.1:${workerAddress.port}`,
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);

    const hostCommandClient = new HostDistributedCommandClient({
      nodeDirectoryService,
      internalEnvelopeAuth: hostAuth,
      defaultSecurityMode: "strict_signed",
    });
    workerUplinkClient = new WorkerEventUplinkClient({
      hostNodeId: "node-host",
      nodeDirectoryService,
      internalEnvelopeAuth: workerAuth,
      defaultSecurityMode: "strict_signed",
    });

    const ensureRemoteNodeReady = vi.fn(async () => undefined);
    const adapter = new TeamRoutingPortAdapter({
      teamRunId,
      runVersion,
      localNodeId: "node-host",
      placementByMember: {
        student: {
          memberName: "student",
          nodeId: "node-worker",
          source: "home",
        },
      },
      ensureRemoteNodeReady,
      dispatchRemoteEnvelope: async (targetNodeId, envelope) => {
        await hostCommandClient.sendCommand(targetNodeId, envelope);
      },
      dispatchLocalUserMessage: async () => undefined,
      dispatchLocalInterAgentMessage: async () => undefined,
      dispatchLocalToolApproval: async () => undefined,
    });

    const dispatchResult = await adapter.dispatchInterAgentMessageRequest({
      senderAgentId: "member-professor-host",
      recipientName: "student",
      content: "hello cross-node",
      messageType: "TASK_ASSIGNMENT",
    } as any);

    if (!dispatchResult.accepted) {
      throw new Error(`Cross-node dispatch failed: ${dispatchResult.errorMessage}`);
    }
    expect(dispatchResult.accepted).toBe(true);
    expect(ensureRemoteNodeReady).toHaveBeenCalledWith("node-worker");
    expect(workerHandledEnvelopes).toHaveLength(1);
    expect(workerHandledEnvelopes[0]).toMatchObject({
      teamRunId,
      runVersion,
      kind: "INTER_AGENT_MESSAGE_REQUEST",
      payload: {
        senderAgentId: "member-professor-host",
        recipientName: "student",
        content: "hello cross-node",
        messageType: "TASK_ASSIGNMENT",
      },
    });

    await waitForCondition(() => hostAggregatedEvents.length >= 1);

    expect(hostAggregatedEvents[0]).toMatchObject({
      teamRunId,
      runVersion,
      sourceNodeId: "node-worker",
      memberName: "student",
      agentId: "member-student-remote",
      eventType: "AGENT_REPLY",
      origin: "remote",
      sequence: 1,
      payload: {
        content: "ack:hello cross-node",
      },
    });
  });
});
