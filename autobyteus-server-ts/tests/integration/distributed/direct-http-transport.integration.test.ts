import fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { TeamEventAggregator } from "../../../src/distributed/event-aggregation/team-event-aggregator.js";
import { WorkerNodeBridgeServer } from "../../../src/distributed/node-bridge/worker-node-bridge-server.js";
import { NodeDirectoryService } from "../../../src/distributed/node-directory/node-directory-service.js";
import { InternalEnvelopeAuth } from "../../../src/distributed/security/internal-envelope-auth.js";
import { registerHostDistributedEventRoutes } from "../../../src/distributed/transport/internal-http/register-host-distributed-event-routes.js";
import { registerWorkerDistributedCommandRoutes } from "../../../src/distributed/transport/internal-http/register-worker-distributed-command-routes.js";
import { HostDistributedCommandClient } from "../../../src/distributed/transport/internal-http/host-distributed-command-client.js";
import { WorkerEventUplinkClient } from "../../../src/distributed/transport/internal-http/worker-event-uplink-client.js";

describe("Direct HTTP transport integration", () => {
  const openApps: Array<ReturnType<typeof fastify>> = [];

  afterEach(async () => {
    for (const app of openApps.splice(0)) {
      await app.close();
    }
  });

  it("dispatches remote command envelopes and uplinks remote events across running nodes", async () => {
    const now = 1_700_000_000_000;
    const secret = "shared-secret";

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

    const handledEnvelopes: unknown[] = [];
    await registerWorkerDistributedCommandRoutes(workerApp, {
      workerNodeBridgeServer: new WorkerNodeBridgeServer(async (envelope) => {
        handledEnvelopes.push(envelope);
      }),
      internalEnvelopeAuth: workerAuth,
      securityMode: "strict_signed",
    });

    const publishedEvents: unknown[] = [];
    await registerHostDistributedEventRoutes(hostApp, {
      teamEventAggregator: new TeamEventAggregator({
        publishSink: (event) => publishedEvents.push(event),
      }),
      internalEnvelopeAuth: hostAuth,
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
    const workerUplinkClient = new WorkerEventUplinkClient({
      hostNodeId: "node-host",
      nodeDirectoryService,
      internalEnvelopeAuth: workerAuth,
      defaultSecurityMode: "strict_signed",
    });

    await hostCommandClient.sendCommand("node-worker", {
      envelopeId: "env-1",
      teamRunId: "run-1",
      runVersion: 1,
      kind: "INTER_AGENT_MESSAGE_REQUEST",
      payload: {
        teamDefinitionId: "def-1",
        senderAgentId: "agent-a",
        recipientName: "worker-agent",
        content: "summarize",
        messageType: "TASK_ASSIGNMENT",
      },
    });

    await workerUplinkClient.publishRemoteEvent({
      teamRunId: "run-1",
      runVersion: 1,
      sourceNodeId: "node-worker",
      sourceEventId: "evt-1",
      memberName: "worker-agent",
      agentId: "agent-worker-1",
      eventType: "AGENT_REPLY",
      payload: { content: "done" },
    });

    expect(handledEnvelopes).toHaveLength(1);
    expect(handledEnvelopes[0]).toMatchObject({
      teamRunId: "run-1",
      kind: "INTER_AGENT_MESSAGE_REQUEST",
    });
    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]).toMatchObject({
      teamRunId: "run-1",
      sourceNodeId: "node-worker",
      eventType: "AGENT_REPLY",
      origin: "remote",
    });
  });

  it("supports per-call worker uplink host override for run-scoped host routing", async () => {
    const now = 1_700_000_000_000;
    const secret = "shared-secret";

    const hostAppA = fastify();
    openApps.push(hostAppA);
    const hostAppB = fastify();
    openApps.push(hostAppB);
    const workerApp = fastify();
    openApps.push(workerApp);

    const hostAuthA = new InternalEnvelopeAuth({
      localNodeId: "node-host-a",
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: ["node-worker"],
      now: () => now,
    });
    const hostAuthB = new InternalEnvelopeAuth({
      localNodeId: "node-host-b",
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: ["node-worker"],
      now: () => now,
    });
    const workerAuth = new InternalEnvelopeAuth({
      localNodeId: "node-worker",
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: ["node-host-a", "node-host-b"],
      now: () => now,
    });

    const eventsOnHostA: unknown[] = [];
    const eventsOnHostB: unknown[] = [];
    await registerHostDistributedEventRoutes(hostAppA, {
      teamEventAggregator: new TeamEventAggregator({
        publishSink: (event) => eventsOnHostA.push(event),
      }),
      internalEnvelopeAuth: hostAuthA,
      securityMode: "strict_signed",
    });
    await registerHostDistributedEventRoutes(hostAppB, {
      teamEventAggregator: new TeamEventAggregator({
        publishSink: (event) => eventsOnHostB.push(event),
      }),
      internalEnvelopeAuth: hostAuthB,
      securityMode: "strict_signed",
    });
    await registerWorkerDistributedCommandRoutes(workerApp, {
      workerNodeBridgeServer: new WorkerNodeBridgeServer(async () => undefined),
      internalEnvelopeAuth: workerAuth,
      securityMode: "strict_signed",
    });

    await hostAppA.listen({ host: "127.0.0.1", port: 0 });
    await hostAppB.listen({ host: "127.0.0.1", port: 0 });
    await workerApp.listen({ host: "127.0.0.1", port: 0 });

    const hostAddressA = hostAppA.server.address();
    const hostAddressB = hostAppB.server.address();
    if (!hostAddressA || typeof hostAddressA === "string") {
      throw new Error("Host A server address is unavailable.");
    }
    if (!hostAddressB || typeof hostAddressB === "string") {
      throw new Error("Host B server address is unavailable.");
    }

    const nodeDirectoryService = new NodeDirectoryService([
      {
        nodeId: "node-host-a",
        baseUrl: `http://127.0.0.1:${hostAddressA.port}`,
        isHealthy: true,
        supportsAgentExecution: true,
      },
      {
        nodeId: "node-host-b",
        baseUrl: `http://127.0.0.1:${hostAddressB.port}`,
        isHealthy: true,
        supportsAgentExecution: true,
      },
      {
        nodeId: "node-worker",
        baseUrl: "http://127.0.0.1:65535",
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);

    const workerUplinkClient = new WorkerEventUplinkClient({
      hostNodeId: "node-host-a",
      nodeDirectoryService,
      internalEnvelopeAuth: workerAuth,
      defaultSecurityMode: "strict_signed",
    });

    await workerUplinkClient.publishRemoteEvent(
      {
        teamRunId: "run-2",
        runVersion: 1,
        sourceNodeId: "node-worker",
        sourceEventId: "evt-override-1",
        memberName: "worker-agent",
        agentId: "agent-worker-2",
        eventType: "AGENT_REPLY",
        payload: { content: "done" },
      },
      "node-host-b",
    );

    expect(eventsOnHostA).toHaveLength(0);
    expect(eventsOnHostB).toHaveLength(1);
    expect(eventsOnHostB[0]).toMatchObject({
      teamRunId: "run-2",
      sourceNodeId: "node-worker",
      eventType: "AGENT_REPLY",
      origin: "remote",
    });
  });
});
