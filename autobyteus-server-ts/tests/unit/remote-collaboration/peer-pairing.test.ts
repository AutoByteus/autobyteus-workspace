import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NodeKeyPeerVerifier } from "../../../src/remote-collaboration/channel/node-key-peer-verifier.js";
import type { PeerPairingAnswer, PeerPairingClient } from "../../../src/remote-collaboration/channel/peer-pairing-client.js";
import type { PeerRoute } from "../../../src/remote-collaboration/channel/peer-connector.js";
import { RemoteCollaborationSettingsError } from "../../../src/remote-collaboration/domain/remote-collaboration-settings-error.js";
import { PeerPairing, PENDING_PAIR_REQUESTS_MAX, type PairingResponse } from "../../../src/remote-collaboration/pairing/peer-pairing.js";
import { PeerDirectory } from "../../../src/remote-collaboration/settings/peer-directory.js";
import { PeerStore } from "../../../src/remote-collaboration/settings/peer-store.js";
import { testNodeKey, testSigner, type TestNodeKey } from "../../helpers/peer-node-keys.js";

/**
 * autobyteus-661 contract §2, §3 (DS-4, DS-5): pairing between real `PeerPairing`s, each with its own peers file and node
 * key. The pairing messages travel in-process to the node at the address (only the HTTP hop is left out); the signed ones
 * (`pair-confirm`, `unpaired`) are signed with the sender's key and admitted only by the receiver's real verifier.
 */

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

type TestNode = Readonly<{
  label: string; nodeId: string; address: string; key: TestNodeKey; peers: PeerDirectory; pairing: PeerPairing; verifier: NodeKeyPeerVerifier; file: string;
}>;
const network = new Map<string, TestNode>();
afterEach(() => network.clear());

const nodeIdOf = (label: string) => `srv_${label}_${"0".repeat(36 - label.length)}`;

/** The in-process transport: the message goes to the node at the route's address, as its routes would hand it over. */
const transport = (sender: () => TestNode): Pick<PeerPairingClient, "send" | "sendSigned"> => {
  const deliver = async (route: PeerRoute, handle: (node: TestNode) => Promise<PairingResponse> | PairingResponse): Promise<PeerPairingAnswer> => {
    const node = network.get(route.address);
    if (!node) throw new RemoteCollaborationSettingsError("PEER_UNREACHABLE", `${route.address} could not be reached.`, { reason: "refused", address: route.address });
    const response = await handle(node);
    return { status: response.status, body: response.answer };
  };
  return {
    send: (route, routePath, body) => deliver(route, (node) => {
      if (routePath === "/rest/remote/pair") return node.pairing.receivePair(body, null);
      if (routePath === "/rest/remote/pair-accepted") return node.pairing.receivePairAccepted(body, null);
      if (routePath === "/rest/remote/pair-rejected") return node.pairing.receivePairRejected(body);
      throw new Error(`unsigned ${routePath}`);
    }),
    sendSigned: (route, routePath, body, nodes) => deliver(route, async (node) => {
      const headers = await testSigner(sender().key).headers({ method: "POST", pathWithQuery: routePath, ...nodes, body: JSON.stringify(body) });
      const verified = await node.verifier.verify({ method: "POST", pathWithQuery: routePath, headers });
      if (!verified.ok) return { status: 401, answer: { code: verified.refusal.code } };
      if (routePath === "/rest/remote/pair-confirm") return node.pairing.receivePairConfirm(body, verified.identity);
      if (routePath === "/rest/remote/unpaired") return node.pairing.receiveUnpaired(verified.identity);
      throw new Error(`signed ${routePath}`);
    }),
  };
};

const makeNode = async (label: string, options: { now?: () => number; addresses?: string[] } = {}): Promise<TestNode> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `pairing-${label}-`)); roots.push(dir);
  const nodeId = nodeIdOf(label);
  const address = `http://${label}:29700`;
  const key = testNodeKey();
  const peers = new PeerDirectory({ store: new PeerStore({ getAppDataDir: () => dir }), probe: { fetchNodeId: async () => nodeId },
    ownNodeId: async () => nodeId, runsInContainer: () => false });
  let self: TestNode | null = null;
  const pairing = new PeerPairing({ peers, client: transport(() => self!), nodeKey: key, ownNodeId: async () => nodeId, ownName: async () => label,
    probe: { fetchNodeId: async (at: string) => { const there = network.get(at); if (!there) throw new Error("refused"); return there.nodeId; } },
    ownAddresses: () => options.addresses ?? [address], ...(options.now ? { now: options.now } : {}) });
  const verifier = new NodeKeyPeerVerifier({ ownNodeId: async () => nodeId, peerKey: (id) => peers.peerKey(id) });
  const node: TestNode = { label, nodeId, address, key, peers, pairing, verifier, file: path.join(dir, "remote-collaboration", "peers.json") };
  self = node;
  network.set(address, node);
  return node;
};

/** Whether `from` can make a signed request that `to` admits (the pair works for collaboration, contract §5). */
const signedRequestWorks = async (from: TestNode, to: TestNode): Promise<boolean> => {
  const headers = await testSigner(from.key).headers({ method: "POST", pathWithQuery: "/rest/remote/availability", fromNodeId: from.nodeId, toNodeId: to.nodeId, body: "{}" });
  return (await to.verifier.verify({ method: "POST", pathWithQuery: "/rest/remote/availability", headers })).ok;
};

describe("PeerPairing: your own nodes, one click (contract §3 case 1)", () => {
  it("NAS-48 AC-004 a grant from B pairs A and B at once: both store the other's key, relation own; signed requests work both ways", async () => {
    const a = await makeNode("alpha"); const b = await makeNode("beta");
    const { grant, expiresAt } = b.pairing.createGrant({ relation: "own" });
    expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now());
    await expect(a.pairing.pair({ address: b.address, grant, nodeId: b.nodeId })).resolves.toMatchObject({
      state: "paired", peer: { nodeId: b.nodeId, name: "beta", address: b.address, relation: "own", paired: true, machine: null, account: null } });
    await expect(b.peers.findByNodeId(a.nodeId)).resolves.toMatchObject({ name: "alpha", address: a.address, relation: "own", paired: true });
    expect(JSON.parse(await fs.readFile(b.file, "utf8")).peers[0].publicKey).toBe(a.key.publicKeyText);
    expect(await signedRequestWorks(a, b)).toBe(true);
    expect(await signedRequestWorks(b, a)).toBe(true);
  });

  it("NAS-48 a grant works once; a used, expired, unknown or other-machine grant is refused and nothing is stored", async () => {
    let now = Date.parse("2026-11-27T10:00:00.000Z");
    const a = await makeNode("alpha"); const b = await makeNode("beta", { now: () => now }); const c = await makeNode("gamma");
    const { grant } = b.pairing.createGrant({ relation: "own" });
    await a.pairing.pair({ address: b.address, grant });
    await expect(c.pairing.pair({ address: b.address, grant })).rejects.toMatchObject({ code: "PEER_PAIRING_REFUSED", message: expect.stringContaining("not valid") });
    const expiring = b.pairing.createGrant({ relation: "own" });
    now += 10 * 60 * 1000 + 1;
    await expect(c.pairing.pair({ address: b.address, grant: expiring.grant })).rejects.toMatchObject({ code: "PEER_PAIRING_REFUSED" });
    await expect(c.pairing.pair({ address: b.address, grant: "made-up" })).rejects.toMatchObject({ code: "PEER_PAIRING_REFUSED" });
    // A grant for a machine on the private network is not used from a plain address (no caller).
    const forMachine = b.pairing.createGrant({ relation: "own", forMachine: "machine-gamma" });
    await expect(b.pairing.receivePair({ nodeId: c.nodeId, name: "gamma", publicKey: c.key.publicKeyText, addresses: [c.address], grant: forMachine.grant }, null))
      .resolves.toMatchObject({ status: 403, answer: { code: "PAIRING_GRANT_INVALID" } });
    await expect(b.pairing.receivePair({ nodeId: c.nodeId, name: "gamma", publicKey: c.key.publicKeyText, addresses: [c.address], grant: forMachine.grant },
      { machine: "machine-gamma", account: "ryan@example.com" })).resolves.toMatchObject({ status: 200 });
    expect((await b.peers.findByNodeId(c.nodeId))).toMatchObject({ machine: "machine-gamma", account: "ryan@example.com" });
    expect((await b.peers.list()).map((peer) => peer.nodeId).sort()).toEqual([a.nodeId, c.nodeId].sort());
    expect(await c.peers.list()).toEqual([]);
  });

  it("NAS-46 a host pairs its sandbox: the sandbox names it `host`, the host saves the sandbox marked `sandbox`", async () => {
    const host = await makeNode("host"); const sandbox = await makeNode("sbx");
    const { grant } = sandbox.pairing.createGrant({ relation: "own", nameForAsker: "host" });
    await expect(host.pairing.pair({ address: sandbox.address, grant, name: "sbx_0a1b2c3d4e", sandbox: true }))
      .resolves.toMatchObject({ state: "paired", peer: { name: "sbx_0a1b2c3d4e", sandbox: true, relation: "own" } });
    await expect(sandbox.peers.findByNodeId(host.nodeId)).resolves.toMatchObject({ name: "host", sandbox: false });
    expect(JSON.parse(await fs.readFile(host.file, "utf8")).peers[0]).toMatchObject({ sandbox: true });
  });

  it("refuses another node answering at the address, and pairing with this node itself", async () => {
    const a = await makeNode("alpha"); const b = await makeNode("beta");
    await expect(a.pairing.pair({ address: b.address, grant: b.pairing.createGrant({ relation: "own" }).grant, nodeId: nodeIdOf("other") }))
      .rejects.toMatchObject({ code: "PEER_IDENTITY_MISMATCH" });
    await expect(a.pairing.receivePair({ nodeId: a.nodeId, name: "alpha", publicKey: a.key.publicKeyText, addresses: [a.address], requestId: "r".repeat(22) }, null))
      .resolves.toMatchObject({ status: 409, answer: { code: "PEER_IS_THIS_NODE" } });
    for (const bad of [{}, { nodeId: b.nodeId, name: "beta", publicKey: "not-a-key", addresses: [b.address], requestId: "r".repeat(22) },
      { nodeId: b.nodeId, name: "beta", publicKey: b.key.publicKeyText, addresses: ["ftp://x"], requestId: "r".repeat(22) },
      { nodeId: b.nodeId, name: "beta", publicKey: b.key.publicKeyText, address: b.address, requestId: "r".repeat(22) },
      { nodeId: b.nodeId, name: "beta", publicKey: b.key.publicKeyText, addresses: [b.address] }]) {
      await expect(a.pairing.receivePair(bad, null)).resolves.toMatchObject({ status: 400 });
    }
    expect(await a.peers.list()).toEqual([]);
  });

  it("contract §2: B keeps the first offered address that answers as A, skipping one that does not answer or answers as another node", async () => {
    const other = await makeNode("other");
    const nowhere = "http://nowhere:1";
    const a = await makeNode("alpha", { addresses: [nowhere, other.address, "http://alpha:29700"] });
    const b = await makeNode("beta");
    await a.pairing.pair({ address: b.address, grant: b.pairing.createGrant({ relation: "own" }).grant });
    await expect(b.peers.findByNodeId(a.nodeId)).resolves.toMatchObject({ address: a.address });
    // The same on a request without a grant: the pending request shows the answering address.
    const c = await makeNode("gamma", { addresses: [nowhere, "http://gamma:29700"] });
    await c.pairing.pair({ address: b.address });
    expect(b.pairing.pendingRequests()).toEqual([expect.objectContaining({ nodeId: c.nodeId, address: c.address })]);
  });

  it("contract §2: when A answers at none of its addresses, B refuses and stores nothing; the grant stays unused", async () => {
    const other = await makeNode("other");
    const a = await makeNode("alpha", { addresses: ["http://nowhere:1", other.address] });
    const b = await makeNode("beta");
    const { grant } = b.pairing.createGrant({ relation: "own" });
    await expect(a.pairing.pair({ address: b.address, grant })).rejects.toMatchObject({ code: "PEER_PAIRING_REFUSED",
      message: "This node reaches the asking node at none of the addresses it gave." });
    await expect(a.pairing.pair({ address: b.address })).rejects.toMatchObject({ code: "PEER_PAIRING_REFUSED" });
    expect([...await a.peers.list(), ...await b.peers.list(), ...b.pairing.pendingRequests(), ...a.pairing.outstandingRequests()]).toEqual([]);
    // The grant was not spent by the refused request.
    const reachable = await makeNode("delta");
    await expect(reachable.pairing.pair({ address: b.address, grant })).resolves.toMatchObject({ state: "paired" });
  });

  it("NAS-23 Pair again: a pair made before node keys is replaced in place, its name kept", async () => {
    const a = await makeNode("alpha"); const b = await makeNode("beta");
    await fs.mkdir(path.dirname(a.file), { recursive: true });
    await fs.writeFile(a.file, JSON.stringify({ peers: [{ nodeId: b.nodeId, name: "nas", address: "http://old:8001", addedAt: "2026-10-01T09:00:00.000Z" }] }));
    expect(await signedRequestWorks(b, a)).toBe(false);
    await a.pairing.pair({ address: b.address, grant: b.pairing.createGrant({ relation: "own" }).grant });
    await expect(a.peers.list()).resolves.toEqual([expect.objectContaining({ nodeId: b.nodeId, name: "nas", address: b.address, paired: true })]);
    expect(await signedRequestWorks(b, a)).toBe(true);
  });
});

describe("PeerPairing: a node this app does not control (contract §3 case 2)", () => {
  it("NAS-49 AC-005 AC-007 Pair waits for the other owner; Accept stores both sides as teammates after A confirms", async () => {
    const a = await makeNode("alpha"); const b = await makeNode("beta");
    const asked = await a.pairing.pair({ address: b.address, name: "bob-laptop" });
    expect(asked).toMatchObject({ state: "waiting", requestId: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/) });
    expect(a.pairing.outstandingRequests()).toEqual([expect.objectContaining({ address: b.address, state: "waiting" })]);
    expect(await b.peers.list()).toEqual([]);
    const [pending] = b.pairing.pendingRequests();
    expect(pending).toMatchObject({ nodeId: a.nodeId, name: "alpha", address: a.address, machine: null, account: null });
    expect(JSON.stringify(b.pairing.pendingRequests())).not.toContain(a.key.publicKeyText);
    await expect(b.pairing.accept(pending!.id)).resolves.toMatchObject({ nodeId: a.nodeId, relation: "teammate", paired: true });
    await expect(a.peers.findByNodeId(b.nodeId)).resolves.toMatchObject({ name: "bob-laptop", address: b.address, relation: "teammate", paired: true });
    expect(a.pairing.outstandingRequests()).toEqual([]);
    expect(b.pairing.pendingRequests()).toEqual([]);
    expect(await signedRequestWorks(a, b)).toBe(true);
    expect(await signedRequestWorks(b, a)).toBe(true);
  });

  it("AC-005 Reject: A shows declined and nothing is stored; Cancel: a later Accept is refused and B keeps nothing", async () => {
    const a = await makeNode("alpha"); const b = await makeNode("beta");
    await a.pairing.pair({ address: b.address });
    await b.pairing.reject(b.pairing.pendingRequests()[0]!.id);
    expect(a.pairing.outstandingRequests()).toEqual([expect.objectContaining({ state: "declined" })]);
    expect([...await a.peers.list(), ...await b.peers.list()]).toEqual([]);

    const again = await a.pairing.pair({ address: b.address });
    expect(again.state === "waiting" && a.pairing.cancel(again.requestId)).toBe(true);
    await expect(b.pairing.accept(b.pairing.pendingRequests()[0]!.id)).rejects.toMatchObject({ code: "PEER_PAIRING_REFUSED" });
    expect([...await a.peers.list(), ...await b.peers.list()]).toEqual([]);
    await expect(b.pairing.accept("no-such-request")).rejects.toMatchObject({ code: "PAIR_REQUEST_NOT_FOUND" });
  });

  it("NAS-50 an acceptance or rejection this node did not ask for is refused, and nothing is stored", async () => {
    const a = await makeNode("alpha"); const c = await makeNode("gamma");
    const identity = { nodeId: c.nodeId, name: "gamma", publicKey: c.key.publicKeyText };
    await expect(a.pairing.receivePairAccepted({ ...identity, requestId: "r".repeat(22) }, null)).resolves.toMatchObject({ status: 403, answer: { code: "PAIR_REQUEST_NOT_FOUND" } });
    await expect(a.pairing.receivePairRejected({ requestId: "r".repeat(22) })).toMatchObject({ status: 403 });
    expect(await a.peers.list()).toEqual([]);
  });

  it("NAS-51 a forged acceptance naming A's request is not confirmed by the node A asked: nothing stored, the real Accept still works", async () => {
    const a = await makeNode("alpha"); const b = await makeNode("beta"); const mallory = await makeNode("mallory");
    const asked = await a.pairing.pair({ address: b.address });
    const requestId = asked.state === "waiting" ? asked.requestId : "";
    // Mallory learned the request ID and answers as itself: A confirms, signed to Mallory, at the address it asked (B).
    await expect(a.pairing.receivePairAccepted({ nodeId: mallory.nodeId, name: "beta", publicKey: mallory.key.publicKeyText, requestId }, null))
      .resolves.toMatchObject({ status: 403, answer: { code: "PAIR_NOT_CONFIRMED" } });
    expect(await a.peers.list()).toEqual([]);
    await b.pairing.accept(b.pairing.pendingRequests()[0]!.id);
    await expect(a.peers.findByNodeId(b.nodeId)).resolves.toMatchObject({ paired: true });
  });

  it("keeps at most 20 pending requests, one per asking node: a repeat replaces it and the oldest is dropped", async () => {
    const b = await makeNode("beta");
    const ask = async (label: string, name = label) => {
      const key = testNodeKey();
      // The asking node answers as itself at the address it gives.
      network.set(`http://${label}:1`, { nodeId: nodeIdOf(label) } as TestNode);
      return b.pairing.receivePair({ nodeId: nodeIdOf(label), name, publicKey: key.publicKeyText, addresses: [`http://${label}:1`], requestId: `${label}`.padEnd(22, "x") }, null);
    };
    await expect(ask("n0")).resolves.toMatchObject({ status: 202, answer: { pending: true } });
    await ask("n0", "renamed");
    expect(b.pairing.pendingRequests()).toEqual([expect.objectContaining({ nodeId: nodeIdOf("n0"), name: "renamed" })]);
    for (let index = 1; index <= PENDING_PAIR_REQUESTS_MAX; index += 1) await ask(`n${index}`);
    const pending = b.pairing.pendingRequests();
    expect(pending).toHaveLength(PENDING_PAIR_REQUESTS_MAX);
    expect(pending.map((request) => request.nodeId)).not.toContain(nodeIdOf("n0"));
    expect(pending.at(-1)!.nodeId).toBe(nodeIdOf(`n${PENDING_PAIR_REQUESTS_MAX}`));
  });
});

describe("PeerPairing: Unpair (contract §2)", () => {
  it("NAS-52 AC-008 Unpair tells the other node with a signed message; both records are gone and requests are refused", async () => {
    const a = await makeNode("alpha"); const b = await makeNode("beta");
    await a.pairing.pair({ address: b.address, grant: b.pairing.createGrant({ relation: "own" }).grant });
    await a.pairing.unpair(b.nodeId);
    expect(await a.peers.list()).toEqual([]);
    expect(await b.peers.list()).toEqual([]);
    expect(await signedRequestWorks(a, b)).toBe(false);
    await expect(a.pairing.unpair(b.nodeId)).rejects.toMatchObject({ code: "PEER_NOT_FOUND" });
  });

  it("an unreachable peer is still unpaired here; its own record stays until its next request is refused", async () => {
    const a = await makeNode("alpha"); const b = await makeNode("beta");
    await a.pairing.pair({ address: b.address, grant: b.pairing.createGrant({ relation: "own" }).grant });
    network.delete(b.address);
    await a.pairing.unpair(b.nodeId);
    expect(await a.peers.list()).toEqual([]);
    expect(await b.peers.list()).toHaveLength(1);
    expect(await signedRequestWorks(b, a)).toBe(false);
  });

  it("an unsigned unpaired or pair-confirm is not taken (the routes are PEER; the handlers need the peer identity)", async () => {
    const b = await makeNode("beta");
    await expect(b.pairing.receiveUnpaired(null)).resolves.toMatchObject({ status: 403 });
    await expect(b.pairing.receivePairConfirm({ nodeId: nodeIdOf("alpha") }, { kind: "peer", nodeId: nodeIdOf("other") })).resolves.toMatchObject({ status: 403 });
  });
});
