import { describe, expect, it } from "vitest";
import { NodeIdentityNotMigratedError } from "../../../src/remote-access/services/node-identity-service.js";
import {
  PeerRequestSignatureVerifier,
  signPeerRequest,
} from "../../../src/remote-collaboration/channel/peer-request-signature.js";

/** Node access model NA-9; design M-7: sender and receiver bound, ±300 s, not before process start, once per nonce. */

const A = "srv_node_a_000000000000000000000000000";
const B = "srv_node_b_000000000000000000000000000";
const SECRET = "shared-peer-secret";
const T = Date.parse("2026-11-08T10:00:00.000Z");

const verifierOn = (nodeId: string, input: { now?: () => number; secrets?: Record<string, string> } = {}) => new PeerRequestSignatureVerifier({
  ownNodeId: async () => nodeId,
  peerSecret: async (peer) => (input.secrets ?? { [A]: SECRET, [B]: SECRET })[peer] ?? null,
  now: input.now ?? (() => T),
});
const signedRequest = (overrides: { from?: string; to?: string; secret?: string; body?: string; path?: string; at?: number } = {}) => {
  const pathWithQuery = overrides.path ?? "/rest/remote/messages";
  const body = overrides.body ?? JSON.stringify({ fromNodeId: A, toNodeId: B });
  const headers = signPeerRequest({
    secret: overrides.secret ?? SECRET, method: "POST", pathWithQuery,
    fromNodeId: overrides.from ?? A, toNodeId: overrides.to ?? B, body, now: new Date(overrides.at ?? T),
  });
  return { method: "POST", pathWithQuery, headers };
};

describe("peer request signature", () => {
  it("NAS-20 a request signed with the pair's secret is the peer it names; the secret is never a header", async () => {
    const request = signedRequest();
    await expect(verifierOn(B).verify(request)).resolves.toEqual({ ok: true, identity: { kind: "peer", nodeId: A } });
    expect(JSON.stringify(request.headers)).not.toContain(SECRET);
  });

  it("NAS-21 a node ID without a valid signature is refused (no signature, a wrong secret, another path)", async () => {
    const verifier = verifierOn(B);
    const unsigned = { method: "POST", pathWithQuery: "/rest/remote/messages", headers: { "x-autobyteus-peer-from": A } };
    expect(verifier.isSigned(unsigned)).toBe(true);
    await expect(verifier.verify(unsigned)).resolves.toMatchObject({ ok: false, refusal: { statusCode: 401 } });
    await expect(verifier.verify(signedRequest({ secret: "guessed" }))).resolves.toMatchObject({ ok: false });
    const moved = { ...signedRequest(), pathWithQuery: "/rest/remote/owner-commands" };
    await expect(verifier.verify(moved)).resolves.toMatchObject({ ok: false });
  });

  it("NAS-22 a replayed request is refused, and so is one older than 300 s or from before this process started", async () => {
    const verifier = verifierOn(B);
    const request = signedRequest();
    await expect(verifier.verify(request)).resolves.toMatchObject({ ok: true });
    await expect(verifier.verify(request)).resolves.toMatchObject({ ok: false, refusal: { code: "NODE_CREDENTIAL_INVALID" } });
    const later = verifierOn(B, { now: () => T + 301_000 });
    await expect(later.verify(signedRequest({ at: T + 1_000 }))).resolves.toMatchObject({ ok: false });
    let now = T;
    const restarted = verifierOn(B, { now: () => now });
    now = T + 10_000;
    await expect(restarted.verify(signedRequest({ at: T - 5_000 }))).resolves.toMatchObject({ ok: false });
  });

  it("NAS-36 a request captured from A to B is refused by A (the receiver it names is B)", async () => {
    await expect(verifierOn(A).verify(signedRequest({ from: A, to: B }))).resolves.toMatchObject({ ok: false });
  });

  it("a node whose identity waits for its data migration answers 503 NODE_IDENTITY_NOT_MIGRATED (autobyteus-290 N-910)", async () => {
    const verifier = new PeerRequestSignatureVerifier({
      ownNodeId: async () => { throw new NodeIdentityNotMigratedError(); },
      peerSecret: async () => SECRET,
      now: () => T,
    });
    await expect(verifier.verify(signedRequest())).resolves.toMatchObject({ ok: false, refusal: { statusCode: 503, code: "NODE_IDENTITY_NOT_MIGRATED" } });
  });

  it("NAS-23 a peer without a secret on this node is refused", async () => {
    await expect(verifierOn(B, { secrets: {} }).verify(signedRequest())).resolves.toMatchObject({ ok: false, refusal: { statusCode: 401 } });
  });
});
