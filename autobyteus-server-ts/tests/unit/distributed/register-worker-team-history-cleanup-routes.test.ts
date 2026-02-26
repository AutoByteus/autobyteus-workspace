import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { InternalEnvelopeAuth } from "../../../src/distributed/security/internal-envelope-auth.js";
import { registerWorkerTeamHistoryCleanupRoutes } from "../../../src/distributed/transport/internal-http/register-worker-team-history-cleanup-routes.js";

describe("registerWorkerTeamHistoryCleanupRoutes", () => {
  it("accepts signed cleanup and runtime probe requests", async () => {
    const now = 1_700_000_000_000;
    const secret = "shared-secret";
    const signer = new InternalEnvelopeAuth({
      localNodeId: "node-host",
      resolveSecretByKeyId: () => secret,
      now: () => now,
    });
    const verifier = new InternalEnvelopeAuth({
      localNodeId: "node-worker",
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: ["node-host"],
      now: () => now,
    });

    const cleanupMemberSubtrees = vi.fn(async () => ({ deletedMemberCount: 2 }));
    const isRuntimeActiveOnLocalNode = vi.fn((teamRunId: string) => teamRunId === "team-active");

    const app = fastify();
    await registerWorkerTeamHistoryCleanupRoutes(app, {
      internalEnvelopeAuth: verifier,
      securityMode: "strict_signed",
      cleanupHandler: {
        cleanupMemberSubtrees,
      } as any,
      runtimeStateProbeService: {
        isRuntimeActiveOnLocalNode,
      } as any,
    });

    const cleanupPayload = {
      teamRunId: "team-1",
      memberAgentIds: ["member-a", "member-b"],
    };
    const cleanupResponse = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/team-history/cleanup",
      payload: cleanupPayload,
      headers: signer.signRequest({ body: cleanupPayload, securityMode: "strict_signed" }),
    });

    expect(cleanupResponse.statusCode).toBe(202);
    expect(cleanupResponse.json()).toMatchObject({
      accepted: true,
      deletedMemberCount: 2,
      code: "OK",
    });
    expect(cleanupMemberSubtrees).toHaveBeenCalledWith(cleanupPayload);

    const probePayload = { teamRunId: "team-active" };
    const probeResponse = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/team-history/runtime-state",
      payload: probePayload,
      headers: signer.signRequest({ body: probePayload, securityMode: "strict_signed" }),
    });

    expect(probeResponse.statusCode).toBe(200);
    expect(probeResponse.json()).toMatchObject({
      accepted: true,
      active: true,
      code: "OK",
    });

    await app.close();
  });

  it("rejects invalid signatures", async () => {
    const now = 1_700_000_000_000;
    const verifier = new InternalEnvelopeAuth({
      localNodeId: "node-worker",
      resolveSecretByKeyId: () => "secret",
      allowedNodeIds: ["node-host"],
      now: () => now,
    });

    const app = fastify();
    await registerWorkerTeamHistoryCleanupRoutes(app, {
      internalEnvelopeAuth: verifier,
      securityMode: "strict_signed",
      cleanupHandler: {
        cleanupMemberSubtrees: vi.fn(async () => ({ deletedMemberCount: 0 })),
      } as any,
      runtimeStateProbeService: {
        isRuntimeActiveOnLocalNode: vi.fn(() => false),
      } as any,
    });

    const payload = {
      teamRunId: "team-1",
      memberAgentIds: ["member-a"],
    };
    const response = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/team-history/cleanup",
      payload,
      headers: {
        "x-ab-node-id": "node-host",
        "x-ab-ts": String(now),
        "x-ab-nonce": "nonce-1",
        "x-ab-key-id": "default",
        "x-ab-signature": "deadbeef",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      accepted: false,
      code: "INVALID_SIGNATURE",
    });

    await app.close();
  });
});
