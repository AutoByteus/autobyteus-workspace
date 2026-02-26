import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { WorkerNodeBridgeServer } from "../../../src/distributed/node-bridge/worker-node-bridge-server.js";
import { InternalEnvelopeAuth } from "../../../src/distributed/security/internal-envelope-auth.js";
import { registerWorkerDistributedCommandRoutes } from "../../../src/distributed/transport/internal-http/register-worker-distributed-command-routes.js";

describe("registerWorkerDistributedCommandRoutes", () => {
  it("accepts signed requests and preserves worker idempotency semantics", async () => {
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

    const executeEnvelope = vi.fn(async () => undefined);
    const app = fastify();
    await registerWorkerDistributedCommandRoutes(app, {
      workerNodeBridgeServer: new WorkerNodeBridgeServer(executeEnvelope),
      internalEnvelopeAuth: verifier,
      securityMode: "strict_signed",
    });

    const payload = {
      envelopeId: "env-1",
      teamRunId: "run-1",
      runVersion: 1,
      kind: "USER_MESSAGE",
      payload: { text: "hello" },
    };

    const first = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/commands",
      payload,
      headers: signer.signRequest({ body: payload, securityMode: "strict_signed" }),
    });
    const second = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/commands",
      payload,
      headers: signer.signRequest({ body: payload, securityMode: "strict_signed" }),
    });

    expect(first.statusCode).toBe(202);
    expect(first.json()).toMatchObject({ accepted: true, deduped: false });
    expect(second.statusCode).toBe(202);
    expect(second.json()).toMatchObject({ accepted: true, deduped: true });
    expect(executeEnvelope).toHaveBeenCalledTimes(1);

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
    await registerWorkerDistributedCommandRoutes(app, {
      workerNodeBridgeServer: new WorkerNodeBridgeServer(async () => undefined),
      internalEnvelopeAuth: verifier,
      securityMode: "strict_signed",
    });

    const payload = {
      envelopeId: "env-2",
      teamRunId: "run-2",
      runVersion: 1,
      kind: "USER_MESSAGE",
      payload: { text: "hello" },
    };
    const response = await app.inject({
      method: "POST",
      url: "/internal/distributed/v1/commands",
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
