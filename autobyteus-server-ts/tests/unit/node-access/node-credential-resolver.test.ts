import { describe, expect, it, vi } from "vitest";
import type { BearerCredentialVerifier, PeerRequestVerifier } from "../../../src/node-access/domain/credential-verification.js";
import { NodeCredentialResolver } from "../../../src/node-access/services/node-credential-resolver.js";

/** Design DS-001: exactly one credential form per request; one verifier per kind (by prefix, or peer headers). */

const verifier = (prefix: string): BearerCredentialVerifier & { verify: ReturnType<typeof vi.fn> } => ({
  prefix,
  verify: vi.fn(async (credential: string) => ({ ok: true as const, identity: { kind: "owner" as const, credentialId: credential } })),
});
const peer = (): PeerRequestVerifier & { verify: ReturnType<typeof vi.fn> } => ({
  isSigned: (request) => request.headers["x-autobyteus-peer-signature"] !== undefined,
  verify: vi.fn(async () => ({ ok: true as const, identity: { kind: "peer" as const, nodeId: "srv_peer" } })),
});
const request = (headers: Record<string, string>, webSocketQueryCredential: string | null = null) =>
  ({ method: "GET", pathWithQuery: "/graphql", headers, webSocketQueryCredential });

describe("NodeCredentialResolver", () => {
  it("NAS-14 a request without a credential is NODE_CREDENTIAL_REQUIRED (401)", async () => {
    const resolver = new NodeCredentialResolver([verifier("own_")], peer());
    await expect(resolver.identify(request({}))).resolves.toMatchObject({ ok: false, refusal: { statusCode: 401, code: "NODE_CREDENTIAL_REQUIRED" } });
  });

  it("hands a Bearer credential or the WebSocket query credential to the verifier of its prefix", async () => {
    const owner = verifier("own_");
    const phone = verifier("mra_");
    const resolver = new NodeCredentialResolver([owner, phone], peer());
    await resolver.identify(request({ authorization: "Bearer own_abc" }));
    await resolver.identify(request({}, "mra_xyz"));
    expect(owner.verify).toHaveBeenCalledWith("own_abc");
    expect(phone.verify).toHaveBeenCalledWith("mra_xyz");
  });

  it("NAS-12 a made-up credential, an unknown prefix, a malformed header or two credential forms are NODE_CREDENTIAL_INVALID", async () => {
    const owner = verifier("own_");
    const signed = peer();
    const resolver = new NodeCredentialResolver([owner], signed);
    for (const input of [
      request({ authorization: "Bearer xyz_unknown" }),
      request({ authorization: "Basic dXNlcg==" }),
      request({ authorization: "Bearer own_a" }, "own_b"),
      request({ authorization: "Bearer own_a", "x-autobyteus-peer-signature": "00" }),
    ]) {
      await expect(resolver.identify(input)).resolves.toMatchObject({ ok: false, refusal: { statusCode: 401, code: "NODE_CREDENTIAL_INVALID" } });
    }
    expect(owner.verify).not.toHaveBeenCalled();
    expect(signed.verify).not.toHaveBeenCalled();
  });

  it("hands a signed request to the peer verifier", async () => {
    const signed = peer();
    const resolver = new NodeCredentialResolver([verifier("own_")], signed);
    await expect(resolver.identify(request({ "x-autobyteus-peer-signature": "00" }))).resolves.toEqual({ ok: true, identity: { kind: "peer", nodeId: "srv_peer" } });
  });
});
