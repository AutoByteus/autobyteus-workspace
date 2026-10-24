import { describe, expect, it, vi } from "vitest";
import { PeerClient } from "../../../src/remote-collaboration/channel/peer-client.js";
import { PeerNodeDiscovery } from "../../../src/remote-collaboration/discovery/peer-node-discovery.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";

/**
 * autobyteus-261 DS-001 / DS-002 on the asking node: `PeerNodeDiscovery` over the real `PeerClient` (only the
 * network is replaced). Every peer state of AC-401 at the unit level: available, refused (switch off, this node not
 * registered there), an older build (404), stopped (transport failure), black-holed (timeout), the wrong node.
 */

const SELF = "srv_self_node_000000000000000000000000";
const peer = (name: string, n: number): PeerNode =>
  ({ nodeId: `srv_${name}_node_00000000000000000000000000`.slice(0, 38) + n, name, baseUrl: `http://${name}:29700`, addedAt: "2026-10-21T09:00:00.000Z" });
const BETA = peer("beta", 1), GAMMA = peer("gamma", 2), DELTA = peer("delta", 3), EPSILON = peer("epsilon", 4), OLD = peer("old", 5), BLACK = peer("black", 6), WRONG = peer("wrong", 7);
const ALL = [BETA, GAMMA, DELTA, EPSILON, OLD, BLACK, WRONG];

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const agents = [{ name: "Publisher", kind: "agent", address: "/publisher" },
  { name: "Studio Team", kind: "agent_team", address: "/studio_team", description: "Writes and checks articles" }];

/** Each peer's behaviour, as the network shows it. */
const network = async (url: string, init: RequestInit) => {
  const target = ALL.find((candidate) => url.startsWith(candidate.baseUrl))!;
  const body = JSON.parse(String(init.body));
  expect(body).toEqual({ fromNodeId: SELF, toNodeId: target.nodeId });
  switch (target) {
    case BETA: return json(url.endsWith("/rest/remote/available-agents") ? { accepted: true, nodeId: BETA.nodeId, agents } : { accepted: true, nodeId: BETA.nodeId });
    case GAMMA: throw new TypeError("fetch failed");
    case DELTA: return json({ accepted: false, nodeId: DELTA.nodeId, code: "REMOTE_COLLABORATION_OFF", message: "Remote collaboration is turned off on this node." });
    case EPSILON: return json({ accepted: false, nodeId: EPSILON.nodeId, code: "PEER_NOT_REGISTERED", message: "The calling node is not a registered peer of this node." });
    case OLD: return json({ message: "Route POST:/rest/remote/availability not found" }, 404);
    case BLACK: return new Promise<never>((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(init.signal!.reason)));
    default: return json({ accepted: true, nodeId: "srv_someone_else" });
  }
};

const setup = (options: { enabled?: boolean; peers?: PeerNode[] } = {}) => {
  const peers = options.peers ?? ALL;
  const fetch = vi.fn(network);
  const capability = { isEnabled: () => options.enabled ?? true };
  const directory = {
    list: async () => peers,
    findByName: async (name: string) => peers.find((candidate) => candidate.name === name) ?? null,
    findByNodeId: async (nodeId: string) => peers.find((candidate) => candidate.nodeId === nodeId) ?? null,
  };
  const client = new PeerClient({ peers: directory, capability, ownNodeId: async () => SELF, timeoutMs: 50, fetch: fetch as never });
  return { discovery: new PeerNodeDiscovery({ capability, peers: directory, client }), fetch };
};

describe("PeerNodeDiscovery.listPeerNodes (DS-001)", () => {
  it("AC-401: each registered peer, in registration order, with its status now; only an accepted answer is available", async () => {
    const f = setup();
    const startedAt = Date.now();
    await expect(f.discovery.listPeerNodes()).resolves.toEqual([
      { name: "beta", status: "available" }, { name: "gamma", status: "unavailable" }, { name: "delta", status: "unavailable" },
      { name: "epsilon", status: "unavailable" }, { name: "old", status: "unavailable" }, { name: "black", status: "unavailable" },
      { name: "wrong", status: "unavailable" },
    ]);
    // All at the same time: the whole call is bounded by one peer timeout, not their sum (QR-401).
    expect(Date.now() - startedAt).toBeLessThan(1_000);
    expect(f.fetch.mock.calls.map(([url]) => url)).toEqual(ALL.map((candidate) => `${candidate.baseUrl}/rest/remote/availability`));
  });

  it("an empty list when no peer is registered; the 'turned off' refusal, with nothing sent, when this node's switch is off", async () => {
    await expect(setup({ peers: [] }).discovery.listPeerNodes()).resolves.toEqual([]);
    const off = setup({ enabled: false });
    await expect(off.discovery.listPeerNodes()).resolves.toEqual({ accepted: false, code: "REMOTE_COLLABORATION_OFF",
      message: "Remote collaboration is turned off on this node, so nothing was sent to another node." });
    expect(off.fetch).not.toHaveBeenCalled();
  });
});

describe("PeerNodeDiscovery.listAvailableAgents (DS-002)", () => {
  it("an available peer's offer, entries as sent (no empty description)", async () => {
    await expect(setup().discovery.listAvailableAgents("beta")).resolves.toEqual(agents);
  });

  it("an unavailable peer gives the specific reason, worded as for delegate_task (SCN-402)", async () => {
    const f = setup();
    await expect(f.discovery.listAvailableAgents("gamma")).resolves.toMatchObject({ code: "PEER_UNREACHABLE", message: 'Node "gamma" could not be reached (fetch failed).' });
    await expect(f.discovery.listAvailableAgents("delta")).resolves.toMatchObject({ code: "REMOTE_COLLABORATION_OFF",
      message: 'Remote collaboration is turned off on node "delta", so it refused the request.' });
    await expect(f.discovery.listAvailableAgents("epsilon")).resolves.toMatchObject({ code: "PEER_NOT_REGISTERED",
      message: 'Node "epsilon" does not have this node registered as a peer, so it refused the request.' });
    await expect(f.discovery.listAvailableAgents("old")).resolves.toMatchObject({ code: "PEER_UNREACHABLE", message: 'Node "old" could not be reached (it answered HTTP 404).' });
    await expect(f.discovery.listAvailableAgents("black")).resolves.toMatchObject({ code: "PEER_UNREACHABLE", message: 'Node "black" could not be reached (it did not answer in time).' });
    await expect(f.discovery.listAvailableAgents("wrong")).resolves.toMatchObject({ code: "PEER_IDENTITY_MISMATCH" });
  });

  it("AC-404: an unregistered node and the switch off are refused here, with nothing sent", async () => {
    const f = setup();
    await expect(f.discovery.listAvailableAgents("nas")).resolves.toEqual({ accepted: false, code: "PEER_NOT_REGISTERED",
      message: 'No peer node named "nas" is registered on this node, so nothing was sent. Use a node name the user gave you; if you have list_peer_nodes, it lists them.' });
    const off = setup({ enabled: false });
    await expect(off.discovery.listAvailableAgents("beta")).resolves.toMatchObject({ accepted: false, code: "REMOTE_COLLABORATION_OFF" });
    expect(f.fetch).not.toHaveBeenCalled();
    expect(off.fetch).not.toHaveBeenCalled();
  });
});

describe("PeerNodeDiscovery.listAvailableAgentsOf (autobyteus-267: the Nodes page)", () => {
  it("a peer's offer by node ID, with the same answers and refusals as by name", async () => {
    const f = setup();
    await expect(f.discovery.listAvailableAgentsOf(BETA.nodeId)).resolves.toEqual(agents);
    await expect(f.discovery.listAvailableAgentsOf(DELTA.nodeId)).resolves.toMatchObject({ code: "REMOTE_COLLABORATION_OFF" });
    await expect(f.discovery.listAvailableAgentsOf(OLD.nodeId)).resolves.toMatchObject({ code: "PEER_UNREACHABLE" });
    await expect(f.discovery.listAvailableAgentsOf("srv_not_a_peer")).resolves.toMatchObject({ code: "PEER_NOT_REGISTERED" });
    await expect(setup({ enabled: false }).discovery.listAvailableAgentsOf(BETA.nodeId)).resolves.toMatchObject({ code: "REMOTE_COLLABORATION_OFF" });
  });

  it("the name-based method (the agent tools) goes through it: one path", async () => {
    const f = setup();
    const byId = vi.spyOn(f.discovery, "listAvailableAgentsOf");
    await f.discovery.listAvailableAgents("beta");
    expect(byId).toHaveBeenCalledExactlyOnceWith(BETA.nodeId);
  });

  it("one-nodes-tab DS-004: checkAvailabilityOf asks one peer whether it admits this node now; an unreachable one says why", async () => {
    const f = setup();
    await expect(f.discovery.checkAvailabilityOf(BETA.nodeId)).resolves.toEqual({ accepted: true });
    await expect(f.discovery.checkAvailabilityOf(DELTA.nodeId)).resolves.toMatchObject({ accepted: false, code: "REMOTE_COLLABORATION_OFF" });
    await expect(f.discovery.checkAvailabilityOf(GAMMA.nodeId)).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE", reason: "unreachable" });
    await expect(f.discovery.checkAvailabilityOf(BLACK.nodeId)).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE", reason: "timeout" });
    expect(f.fetch.mock.calls.map(([url]) => url)).toEqual([BETA, DELTA, GAMMA, BLACK].map((p) => `${p.baseUrl}/rest/remote/availability`));
  });
});
