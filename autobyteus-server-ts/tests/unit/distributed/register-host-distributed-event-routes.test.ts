import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { TeamEventAggregator } from "../../../src/distributed/event-aggregation/team-event-aggregator.js";
import { RemoteEventIdempotencyPolicy } from "../../../src/distributed/policies/remote-event-idempotency-policy.js";
import { RunVersionFencingPolicy } from "../../../src/distributed/policies/run-version-fencing-policy.js";
import { InternalEnvelopeAuth } from "../../../src/distributed/security/internal-envelope-auth.js";
import { registerHostDistributedEventRoutes } from "../../../src/distributed/transport/internal-http/register-host-distributed-event-routes.js";

describe("registerHostDistributedEventRoutes", () => {
  it("accepts valid events and drops stale run versions", async () => {
    const now = 1_700_000_000_000;
    const secret = "shared-secret";
    const signer = new InternalEnvelopeAuth({
      localNodeId: "node-worker",
      resolveSecretByKeyId: () => secret,
      now: () => now,
    });
    const verifier = new InternalEnvelopeAuth({
      localNodeId: "node-host",
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: ["node-worker"],
      now: () => now,
    });
    const publishSink = vi.fn();
    const rebroadcastRemoteEvent = vi.fn(async () => ({
      published: true,
      publishedSessionCount: 1,
    }));
    const app = fastify();
    await registerHostDistributedEventRoutes(app, {
      teamEventAggregator: new TeamEventAggregator({ publishSink }),
      internalEnvelopeAuth: verifier,
      runVersionFencingPolicy: new RunVersionFencingPolicy(async () => 2),
      remoteEventIdempotencyPolicy: new RemoteEventIdempotencyPolicy({ ttlMs: 60_000, maxEntries: 100, now: () => now }),
      securityMode: "strict_signed",
      remoteEventRebroadcastService: {
        rebroadcastRemoteEvent,
      } as any,
    });

    const activePayload = {
      teamRunId: "run-1",
      runVersion: 2,
      sourceNodeId: "node-worker",
      sourceEventId: "evt-1",
      memberName: "worker",
      agentId: "agent-1",
      eventType: "AGENT_REPLY",
      payload: { text: "ok" },
    };
    const stalePayload = {
      ...activePayload,
      runVersion: 1,
      sourceEventId: "evt-2",
    };

    const duplicatePayload = {
      ...activePayload,
      sourceEventId: "evt-1",
    };

    const activeResponse = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/events",
      payload: activePayload,
      headers: signer.signRequest({ body: activePayload, securityMode: "strict_signed" }),
    });
    const staleResponse = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/events",
      payload: stalePayload,
      headers: signer.signRequest({ body: stalePayload, securityMode: "strict_signed" }),
    });
    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/events",
      payload: duplicatePayload,
      headers: signer.signRequest({ body: duplicatePayload, securityMode: "strict_signed" }),
    });

    expect(activeResponse.statusCode).toBe(202);
    expect(activeResponse.json()).toMatchObject({ accepted: true, dropped: false });
    expect(staleResponse.statusCode).toBe(202);
    expect(staleResponse.json()).toMatchObject({ accepted: true, dropped: true, reason: "STALE_RUN_VERSION" });
    expect(duplicateResponse.statusCode).toBe(202);
    expect(duplicateResponse.json()).toMatchObject({
      accepted: true,
      dropped: true,
      reason: "DUPLICATE_SOURCE_EVENT",
    });
    expect(publishSink).toHaveBeenCalledTimes(1);
    expect(rebroadcastRemoteEvent).toHaveBeenCalledTimes(1);

    await app.close();
  });
});
