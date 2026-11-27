import { describe, expect, it } from "vitest";
import { NodeIdentityNotMigratedError } from "../../../src/remote-access/services/node-identity-service.js";
import { NodeKeyPeerVerifier, type PeerVerificationKey } from "../../../src/remote-collaboration/channel/node-key-peer-verifier.js";
import { peerRequestTarget } from "../../../src/remote-collaboration/channel/peer-connector.js";
import { PeerRequestSigner } from "../../../src/remote-collaboration/channel/peer-request-signer.js";
import { testNodeKey, type TestNodeKey } from "../../helpers/peer-node-keys.js";

/**
 * Node access model NA-9, autobyteus-661 contract §5: Ed25519 with the sender's node key over from, to, timestamp (ms),
 * nonce, method, path and body hash; sender and receiver bound, ±300 s, not before this node started, once per nonce,
 * the record's key, and over the private network the record's machine.
 */

const A = "srv_node_a_000000000000000000000000000";
const B = "srv_node_b_000000000000000000000000000";
const T = Date.parse("2026-11-08T10:00:00.000Z");
const KEY_A = testNodeKey();
const KEY_STOLEN = testNodeKey();

const verifierOn = (nodeId: string, input: { now?: () => number; peers?: Record<string, PeerVerificationKey> } = {}) => new NodeKeyPeerVerifier({
  ownNodeId: async () => nodeId,
  peerKey: async (peer) => (input.peers ?? { [A]: { publicKey: KEY_A.publicKeyText, machine: null } })[peer] ?? null,
  now: input.now ?? (() => T),
});
const signedRequest = async (overrides: { from?: string; to?: string; key?: TestNodeKey; body?: string; path?: string; at?: number } = {}) => {
  const pathWithQuery = overrides.path ?? "/rest/remote/messages";
  const body = overrides.body ?? JSON.stringify({ fromNodeId: A, toNodeId: B });
  const headers = await new PeerRequestSigner({ key: overrides.key ?? KEY_A, now: () => overrides.at ?? T }).headers({
    method: "POST", pathWithQuery, fromNodeId: overrides.from ?? A, toNodeId: overrides.to ?? B, body,
  });
  return { method: "POST", pathWithQuery, headers };
};

describe("node-key peer request signature", () => {
  it("NAS-20 a request signed with the peer's node key is the peer it names; no key travels in a header", async () => {
    const request = await signedRequest();
    await expect(verifierOn(B).verify(request)).resolves.toEqual({ ok: true, identity: { kind: "peer", nodeId: A } });
    expect(JSON.stringify(request.headers)).not.toContain(KEY_A.publicKeyText);
    expect(Object.keys(request.headers).sort()).toEqual([
      "x-autobyteus-peer-body-sha256", "x-autobyteus-peer-from", "x-autobyteus-peer-nonce",
      "x-autobyteus-peer-signature", "x-autobyteus-peer-timestamp", "x-autobyteus-peer-to",
    ]);
    // The timestamp is milliseconds; the nonce is 16 random bytes (base64url).
    expect(request.headers["x-autobyteus-peer-timestamp"]).toBe(String(T));
    expect(request.headers["x-autobyteus-peer-nonce"]).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("NAS-21 a node ID without a valid signature is refused (no signature, another node's key, another path, another body hash)", async () => {
    const verifier = verifierOn(B);
    const unsigned = { method: "POST", pathWithQuery: "/rest/remote/messages", headers: { "x-autobyteus-peer-from": A } };
    expect(verifier.isSigned(unsigned)).toBe(true);
    await expect(verifier.verify(unsigned)).resolves.toMatchObject({ ok: false, refusal: { statusCode: 401 } });
    await expect(verifier.verify(await signedRequest({ key: KEY_STOLEN }))).resolves.toMatchObject({ ok: false });
    const moved = { ...await signedRequest(), pathWithQuery: "/rest/remote/owner-commands" };
    await expect(verifier.verify(moved)).resolves.toMatchObject({ ok: false });
    const request = await signedRequest();
    const otherBody = { ...request, headers: { ...request.headers, "x-autobyteus-peer-body-sha256": "0".repeat(64) } };
    await expect(verifier.verify(otherBody)).resolves.toMatchObject({ ok: false });
  });

  it("NAS-22 a replayed request is refused, and so is one older than 300 s or from before this node started", async () => {
    const verifier = verifierOn(B);
    const request = await signedRequest();
    await expect(verifier.verify(request)).resolves.toMatchObject({ ok: true });
    await expect(verifier.verify(request)).resolves.toMatchObject({ ok: false, refusal: { code: "NODE_CREDENTIAL_INVALID" } });
    const later = verifierOn(B, { now: () => T + 301_000 });
    await expect(later.verify(await signedRequest({ at: T + 1_000 }))).resolves.toMatchObject({ ok: false });
    let now = T;
    const restarted = verifierOn(B, { now: () => now });
    now = T + 10_000;
    await expect(restarted.verify(await signedRequest({ at: T - 5_000 }))).resolves.toMatchObject({ ok: false });
  });

  it("NAS-36 a request captured from A to B is refused by A (the receiver it names is B)", async () => {
    await expect(verifierOn(A, { peers: { [A]: { publicKey: KEY_A.publicKeyText, machine: null } } }).verify(await signedRequest({ from: A, to: B })))
      .resolves.toMatchObject({ ok: false });
  });

  it("a node whose identity waits for its data migration answers 503 NODE_IDENTITY_NOT_MIGRATED (autobyteus-290 N-910)", async () => {
    const verifier = new NodeKeyPeerVerifier({
      ownNodeId: async () => { throw new NodeIdentityNotMigratedError(); },
      peerKey: async () => ({ publicKey: KEY_A.publicKeyText, machine: null }),
      now: () => T,
    });
    await expect(verifier.verify(await signedRequest())).resolves.toMatchObject({ ok: false, refusal: { statusCode: 503, code: "NODE_IDENTITY_NOT_MIGRATED" } });
  });

  it("NAS-20 a peer at a gateway base path (company address) signs the node route its receiver sees, not the base path", async () => {
    const target = peerRequestTarget("https://gateway.example.com/autobyteus", "/rest/remote/messages");
    expect(target.url.toString()).toBe("https://gateway.example.com/autobyteus/rest/remote/messages");
    expect(target.pathWithQuery).toBe("/rest/remote/messages");
    expect(peerRequestTarget("http://192.168.2.31:29695", "/rest/remote/run-observations?x=1").pathWithQuery).toBe("/rest/remote/run-observations?x=1");
    expect(peerRequestTarget("wss://gateway.example.com/autobyteus/", "/rest/remote/run-observations").pathWithQuery).toBe("/rest/remote/run-observations");
    // The receiving node (behind the prefix-stripping gateway) verifies the route it receives.
    const request = await signedRequest({ path: target.pathWithQuery });
    await expect(verifierOn(B).verify({ ...request, pathWithQuery: "/rest/remote/messages" }))
      .resolves.toEqual({ ok: true, identity: { kind: "peer", nodeId: A } });
  });

  it("NAS-23 a peer paired before node keys (no key) or not paired at all is refused", async () => {
    await expect(verifierOn(B, { peers: { [A]: { publicKey: null, machine: null } } }).verify(await signedRequest()))
      .resolves.toMatchObject({ ok: false, refusal: { statusCode: 401 } });
    await expect(verifierOn(B, { peers: {} }).verify(await signedRequest())).resolves.toMatchObject({ ok: false, refusal: { statusCode: 401 } });
  });

  it("NAS-47 over the private network the caller must be the record's machine: a stolen key on another machine is refused", async () => {
    const onMachine = verifierOn(B, { peers: { [A]: { publicKey: KEY_A.publicKeyText, machine: "machine-a" } } });
    await expect(onMachine.verify({ ...await signedRequest(), privateNetworkCaller: { machine: "machine-a", account: "ryan@example.com" } }))
      .resolves.toEqual({ ok: true, identity: { kind: "peer", nodeId: A } });
    await expect(onMachine.verify({ ...await signedRequest(), privateNetworkCaller: { machine: "machine-x", account: "ryan@example.com" } }))
      .resolves.toMatchObject({ ok: false, refusal: { statusCode: 401 } });
    // A peer paired on the private network is not taken from a plain address, nor one paired by address from the network.
    await expect(onMachine.verify(await signedRequest())).resolves.toMatchObject({ ok: false });
    await expect(verifierOn(B).verify({ ...await signedRequest(), privateNetworkCaller: { machine: "machine-a", account: null } }))
      .resolves.toMatchObject({ ok: false });
  });

  it("an unreadable peers file refuses the request instead of failing it", async () => {
    const verifier = new NodeKeyPeerVerifier({ ownNodeId: async () => B, peerKey: async () => { throw new Error("peers.json unreadable"); }, now: () => T });
    await expect(verifier.verify(await signedRequest())).resolves.toMatchObject({ ok: false, refusal: { statusCode: 401 } });
  });
});
