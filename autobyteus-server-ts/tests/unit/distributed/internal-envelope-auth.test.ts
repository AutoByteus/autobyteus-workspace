import { describe, expect, it } from "vitest";
import { InternalEnvelopeAuth } from "../../../src/distributed/security/internal-envelope-auth.js";

describe("InternalEnvelopeAuth", () => {
  it("accepts strict-signed requests and rejects nonce replay", () => {
    const secret = "shared-secret";
    const now = 1_700_000_000_000;
    const verifier = new InternalEnvelopeAuth({
      localNodeId: "node-host",
      resolveSecretByKeyId: (keyId) => (keyId === "default" ? secret : null),
      allowedNodeIds: ["node-host", "node-worker"],
      now: () => now,
    });
    const signer = new InternalEnvelopeAuth({
      localNodeId: "node-worker",
      resolveSecretByKeyId: (keyId) => (keyId === "default" ? secret : null),
      now: () => now,
    });

    const body = { hello: "world" };
    const headers = signer.signRequest({ body, securityMode: "strict_signed" });
    const first = verifier.verifyRequest({
      headers,
      body,
      securityMode: "strict_signed",
    });
    const replay = verifier.verifyRequest({
      headers,
      body,
      securityMode: "strict_signed",
    });

    expect(first).toMatchObject({
      accepted: true,
      sourceNodeId: "node-worker",
    });
    expect(replay).toMatchObject({
      accepted: false,
      code: "REPLAY_DETECTED",
    });
  });

  it("accepts trusted-lan requests without signature when allowlist and timestamp pass", () => {
    const now = 1_700_000_000_000;
    const verifier = new InternalEnvelopeAuth({
      localNodeId: "node-host",
      resolveSecretByKeyId: () => null,
      allowedNodeIds: ["node-worker"],
      now: () => now,
    });

    const result = verifier.verifyRequest({
      headers: {
        "x-ab-node-id": "node-worker",
        "x-ab-ts": String(now),
      },
      body: { ping: true },
      securityMode: "trusted_lan",
    });

    expect(result).toMatchObject({
      accepted: true,
      sourceNodeId: "node-worker",
    });
  });

  it("rejects trusted-lan requests from disallowed nodes", () => {
    const now = 1_700_000_000_000;
    const verifier = new InternalEnvelopeAuth({
      localNodeId: "node-host",
      resolveSecretByKeyId: () => null,
      allowedNodeIds: ["node-worker"],
      now: () => now,
    });

    const result = verifier.verifyRequest({
      headers: {
        "x-ab-node-id": "node-intruder",
        "x-ab-ts": String(now),
      },
      body: { ping: true },
      securityMode: "trusted_lan",
    });

    expect(result).toMatchObject({
      accepted: false,
      code: "SOURCE_NODE_NOT_ALLOWED",
    });
  });
});
