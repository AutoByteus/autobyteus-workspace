import { describe, expect, it, vi } from "vitest";
import { HostDistributedCommandClient } from "../../../src/distributed/transport/internal-http/host-distributed-command-client.js";
import { NodeDirectoryService } from "../../../src/distributed/node-directory/node-directory-service.js";
import { InternalEnvelopeAuth } from "../../../src/distributed/security/internal-envelope-auth.js";

describe("HostDistributedCommandClient", () => {
  it("posts envelopes to the worker internal command route with signed headers", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }));
    const client = new HostDistributedCommandClient({
      nodeDirectoryService: new NodeDirectoryService([
        {
          nodeId: "node-worker",
          baseUrl: "http://worker.local:8000",
          isHealthy: true,
          supportsAgentExecution: true,
        },
      ]),
      internalEnvelopeAuth: new InternalEnvelopeAuth({
        localNodeId: "node-host",
        resolveSecretByKeyId: () => "secret",
        now: () => 1_700_000_000_000,
      }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.sendCommand("node-worker", {
      envelopeId: "env-1",
      teamRunId: "run-1",
      runVersion: 1,
      kind: "USER_MESSAGE",
      payload: { text: "hello" },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://worker.local:8000/internal/distributed/v1/commands",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-ab-node-id": "node-host",
          "x-ab-signature": expect.any(String),
        }),
      }),
    );
  });
});
