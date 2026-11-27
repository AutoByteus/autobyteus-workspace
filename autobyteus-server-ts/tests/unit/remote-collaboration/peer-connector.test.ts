import http from "node:http";
import type net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import { NodeKeyPeerVerifier } from "../../../src/remote-collaboration/channel/node-key-peer-verifier.js";
import { PeerClient } from "../../../src/remote-collaboration/channel/peer-client.js";
import { PeerConnector } from "../../../src/remote-collaboration/channel/peer-connector.js";
import { PeerPairingClient } from "../../../src/remote-collaboration/channel/peer-pairing-client.js";
import { openPeerRunObservation } from "../../../src/remote-collaboration/channel/peer-run-observation-client.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";
import { startFakeNetworkRelay, type FakeNetworkRelay } from "../../helpers/fake-network-relay.js";
import { testNodeKey, testSigner } from "../../helpers/peer-node-keys.js";

/**
 * autobyteus-661 AR-003, DS-6: `PeerConnector` is the only owner of the route to a peer. A peer paired over the private
 * network (a record with a `machine`) is reached only through this node's network relay, an HTTP CONNECT tunnel with
 * the relay's credential; every sender (requests, pairing messages, the run-observation upgrade) goes the same way.
 */

const SELF = "srv_self_node_000000000000000000000000";
const SELF_MACHINE = "machine-self";
const PRIVATE_ADDRESS = "http://100.88.80.80:8000";
const PEER: PeerNode = { nodeId: "srv_peer_node_000000000000000000000000", name: "linux-box", address: PRIVATE_ADDRESS, machine: "machine-peer",
  account: "ryan@example.com", relation: "own", sandbox: false, addedAt: "2026-11-27T09:00:00.000Z", paired: true };
const SELF_KEY = testNodeKey();
/** The peer's verifier: it holds this node's key and machine, and sees the caller the network proved. */
const VERIFIER = new NodeKeyPeerVerifier({ ownNodeId: async () => PEER.nodeId,
  peerKey: async (nodeId) => (nodeId === SELF ? { publicKey: SELF_KEY.publicKeyText, machine: SELF_MACHINE } : null) });
const verified = (method: string, pathWithQuery: string, headers: http.IncomingHttpHeaders) => VERIFIER.verify({
  method, pathWithQuery, headers: headers as Record<string, string>, privateNetworkCaller: { machine: SELF_MACHINE, account: "ryan@example.com" } });

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });

type Received = { method: string; url: string; headers: http.IncomingHttpHeaders; body: string };
/** The peer node (on the tailnet in reality; here a local server the relay routes its private address to). */
const startPeer = async () => {
  const received: Received[] = [];
  const upgrades: Array<{ url: string; headers: http.IncomingHttpHeaders; firstMessage: Promise<string> }> = [];
  const server = http.createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      received.push({ method: request.method!, url: request.url!, headers: request.headers, body });
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ accepted: true, nodeId: PEER.nodeId }));
    });
  });
  const sockets = new WebSocketServer({ server });
  sockets.on("connection", (socket, request) => {
    upgrades.push({ url: request.url!, headers: request.headers, firstMessage: new Promise((resolve) => socket.once("message", (data) => resolve(String(data)))) });
    socket.send(JSON.stringify({ nodeId: PEER.nodeId, accepted: true }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  cleanups.push(() => new Promise<void>((resolve) => { sockets.close(); server.closeAllConnections(); server.close(() => resolve()); }));
  return { port: (server.address() as net.AddressInfo).port, received, upgrades };
};

const relayTo = async (peerPort: number, credential?: string): Promise<FakeNetworkRelay> => {
  const relay = await startFakeNetworkRelay({ credential, route: (authority) => (authority === "100.88.80.80:8000" ? peerPort : null) });
  cleanups.push(() => relay.close());
  return relay;
};

const connectorWith = (networkRelay?: () => Promise<{ port: number; credential: string }>) => {
  const connector = new PeerConnector(networkRelay ? { networkRelay } : {});
  cleanups.push(() => connector.close());
  return connector;
};

describe("PeerConnector", () => {
  it("reaches a private-network peer only through the network relay: CONNECT to its private address with the relay credential; request, pairing message and run-view upgrade arrive signed and unchanged", async () => {
    const peer = await startPeer();
    const relay = await relayTo(peer.port);
    const connector = connectorWith(async () => ({ port: relay.port, credential: relay.credential }));

    const client = new PeerClient({ peers: { findByName: async () => PEER, findByNodeId: async () => PEER }, signer: testSigner(SELF_KEY), connector, ownNodeId: async () => SELF });
    await expect(client.checkAvailability(PEER.nodeId)).resolves.toEqual({ accepted: true });
    expect(peer.received[0]).toMatchObject({ method: "POST", url: "/rest/remote/availability", headers: { host: "100.88.80.80:8000" } });
    await expect(verified("POST", "/rest/remote/availability", peer.received[0]!.headers)).resolves.toMatchObject({ ok: true, identity: { kind: "peer", nodeId: SELF } });

    const pairing = new PeerPairingClient({ signer: testSigner(SELF_KEY), connector });
    await expect(pairing.sendSigned(PEER, "/rest/remote/unpaired", {}, { fromNodeId: SELF, toNodeId: PEER.nodeId })).resolves.toMatchObject({ status: 200 });
    await expect(verified("POST", "/rest/remote/unpaired", peer.received[1]!.headers)).resolves.toMatchObject({ ok: true });

    const ended: string[] = [];
    const stream = openPeerRunObservation({
      resolvePeer: async () => PEER, signer: testSigner(SELF_KEY), connector, ownNodeId: async () => SELF, path: "/ws/peer-run",
      targetRoot: { kind: "agent", runId: "publisher_7f3" }, observer: { onFrame: () => undefined, onEnd: () => ended.push("end") }, openingTimeoutMs: 5_000,
    });
    cleanups.push(() => stream.close());
    await expect.poll(() => peer.upgrades.length).toBe(1);
    expect(peer.upgrades[0]).toMatchObject({ url: "/ws/peer-run", headers: { host: "100.88.80.80:8000" } });
    await expect(verified("GET", "/ws/peer-run", peer.upgrades[0]!.headers)).resolves.toMatchObject({ ok: true });
    expect(JSON.parse(await peer.upgrades[0]!.firstMessage)).toMatchObject({ fromNodeId: SELF, toNodeId: PEER.nodeId, targetRoot: { kind: "agent", runId: "publisher_7f3" } });
    expect(ended).toEqual([]);

    // Every connection went through the relay, to the peer's private address; none around it.
    expect(relay.asked.length).toBeGreaterThanOrEqual(2);
    expect(new Set(relay.asked)).toEqual(new Set(["100.88.80.80:8000"]));
    expect(relay.refusedCredentials()).toBe(0);
  });

  it("one dispatcher per relay start; a stale credential is refused by the relay and the request fails; a peer paired by plain address goes directly", async () => {
    const peer = await startPeer();
    const relay = await relayTo(peer.port, "current-credential");
    let credential = "current-credential";
    const connector = connectorWith(async () => ({ port: relay.port, credential }));
    const first = await connector.target(PEER, "/rest/remote/availability");
    expect(first).toMatchObject({ kind: "relayed", pathWithQuery: "/rest/remote/availability" });
    expect((await connector.target(PEER, "/rest/remote/x")).kind === "relayed" && (await connector.target(PEER, "/rest/remote/x") as { dispatcher: unknown }).dispatcher)
      .toBe((first as { dispatcher: unknown }).dispatcher);

    credential = "stale-credential";
    const stale = await connector.target(PEER, "/rest/remote/availability");
    expect((stale as { dispatcher: unknown }).dispatcher).not.toBe((first as { dispatcher: unknown }).dispatcher);
    const client = new PeerClient({ peers: { findByName: async () => PEER, findByNodeId: async () => PEER }, signer: testSigner(SELF_KEY), connector, ownNodeId: async () => SELF });
    await expect(client.checkAvailability(PEER.nodeId)).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE" });
    expect(relay.refusedCredentials()).toBe(1);
    expect(peer.received).toEqual([]);

    await expect(connector.target({ address: "http://192.168.2.124:29695", machine: null }, "/rest/remote/availability?x=1")).resolves.toMatchObject({
      kind: "direct", dispatcher: null, pathWithQuery: "/rest/remote/availability?x=1" });
  });

  it("without the relay a private-network peer is unavailable with the reason, never reached directly", async () => {
    await expect(connectorWith().target(PEER, "/rest/remote/availability")).resolves.toEqual({
      kind: "unavailable", detail: "it is on the private network, and this node's Private Network is not on" });
    const notSetUp = Object.assign(new Error("Private Network is not set up on this node."), { code: "PRIVATE_NETWORK_NOT_SET_UP" });
    await expect(connectorWith(async () => { throw notSetUp; }).target(PEER, "/rest/remote/availability")).resolves.toEqual({
      kind: "unavailable", detail: "it is on the private network, and this node's Private Network is not on" });
    await expect(connectorWith(async () => { throw new Error("the program is not running"); }).target(PEER, "/rest/remote/availability")).resolves.toEqual({
      kind: "unavailable", detail: "this node's network relay is not available (the program is not running)" });
  });
});
