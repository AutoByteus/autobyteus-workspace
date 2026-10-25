import { describe, expect, it, vi } from "vitest";
import { PeerClient } from "../../../src/remote-collaboration/channel/peer-client.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";

/** Design § Contract Between Nodes / § Ownership Map `PeerClient` (QR-102, REQ-109, REQ-113, AR-004). */

const SELF = "srv_self_node_000000000000000000000000";
const PEER: PeerNode = { nodeId: "srv_peer_node_000000000000000000000000", name: "docker", baseUrl: "http://peer:29700", addedAt: "2026-10-20T09:00:00.000Z" };

const answer = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

const client = (fetchImpl: (url: string, init: RequestInit) => Promise<ReturnType<typeof answer>>, options: { enabled?: boolean; timeoutMs?: number } = {}) => {
  const fetch = vi.fn(fetchImpl);
  return {
    fetch,
    client: new PeerClient({
      peers: { findByName: async (name) => name === "docker" ? PEER : null, findByNodeId: async (nodeId) => nodeId === PEER.nodeId ? PEER : null },
      capability: { isEnabled: () => options.enabled ?? true },
      ownNodeId: async () => SELF,
      timeoutMs: options.timeoutMs,
      fetch: fetch as never,
    }),
  };
};

const start = { nodeId: PEER.nodeId, address: "/publisher", delegatorAgentRunId: "agent_a1", coordinatingRun: { kind: "agent" as const, runId: "agent_a1" } };
const message = {
  nodeId: PEER.nodeId, kind: "message" as const, messageId: "collabmsg_1", senderAgentRunId: "agent_a1",
  targetRoot: { kind: "agent" as const, runId: "publisher_7f3" }, targetAgentRunId: "publisher_7f3",
  content: "hi", messageType: "agent_message", createdAt: "2026-10-20T10:00:00.000Z",
};

describe("PeerClient", () => {
  it("sends the envelope and the request to the peer's pinned URL, with no credential, and returns the peer's run ID", async () => {
    const f = client(async () => answer({ accepted: true, nodeId: PEER.nodeId, kind: "agent", agentRunId: "publisher_7f3" }));
    await expect(f.client.startDelegatedRun(start)).resolves.toEqual({ accepted: true, kind: "agent", agentRunId: "publisher_7f3" });
    const [url, init] = f.fetch.mock.calls[0]!;
    expect(url).toBe("http://peer:29700/rest/remote/delegated-runs");
    expect(JSON.parse(String(init.body))).toEqual({ fromNodeId: SELF, toNodeId: PEER.nodeId, address: "/publisher",
      delegator: { agentRunId: "agent_a1" }, coordinatingRun: { kind: "agent", runId: "agent_a1" } });
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("autobyteus-247 G-7: reads a started Team (its coordinator and members); an answer without the run it started is unreachable", async () => {
    const members = [{ address: "/studio/lead", agentRunId: "lead_1" }, { address: "/studio/writer", agentRunId: "writer_1" }];
    const team = client(async () => answer({ accepted: true, nodeId: PEER.nodeId, kind: "agent_team", teamRunId: "team_1", coordinatorAddress: "/studio/lead", members }));
    await expect(team.client.startDelegatedRun({ ...start, address: "/studio" })).resolves.toEqual({
      accepted: true, kind: "agent_team", teamRunId: "team_1", coordinatorAddress: "/studio/lead", members });
    for (const body of [
      { accepted: true, nodeId: PEER.nodeId, agentRunId: "publisher_7f3" },
      { accepted: true, nodeId: PEER.nodeId, kind: "agent_team", teamRunId: "team_1", coordinatorAddress: "/studio/other", members },
      { accepted: true, nodeId: PEER.nodeId, kind: "agent_team", teamRunId: "team_1", coordinatorAddress: "/studio/lead", members: [] },
    ]) {
      const f = client(async () => answer(body));
      await expect(f.client.startDelegatedRun(start)).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE" });
    }
  });

  it("G-2: a message names the root that receives it on the peer", async () => {
    const f = client(async () => answer({ accepted: true, nodeId: PEER.nodeId }));
    await expect(f.client.deliverMessage({ ...message, targetRoot: { kind: "agent_team", runId: "team_1" }, targetAgentRunId: "lead_1" })).resolves.toEqual({ accepted: true });
    const body = JSON.parse(String(f.fetch.mock.calls[0]![1].body));
    expect(body).toMatchObject({ kind: "message", targetRoot: { kind: "agent_team", runId: "team_1" }, target: { agentRunId: "lead_1" } });
    expect("coordinatingRun" in body).toBe(false);
  });

  it("autobyteus-261: availability and available agents send only the envelope to their routes", async () => {
    const f = client(async (url) => answer(url.endsWith("/available-agents") ? { accepted: true, nodeId: PEER.nodeId, agents: [] } : { accepted: true, nodeId: PEER.nodeId }));
    await expect(f.client.checkAvailability(PEER.nodeId)).resolves.toEqual({ accepted: true });
    await expect(f.client.listAvailableAgents(PEER.nodeId)).resolves.toEqual({ accepted: true, agents: [] });
    expect(f.fetch.mock.calls.map(([url, init]) => [url, JSON.parse(String(init.body))])).toEqual([
      ["http://peer:29700/rest/remote/availability", { fromNodeId: SELF, toNodeId: PEER.nodeId }],
      ["http://peer:29700/rest/remote/available-agents", { fromNodeId: SELF, toNodeId: PEER.nodeId }],
    ]);
  });

  it("autobyteus-261 N-401: reads a peer's list strictly; any entry with another field, or a bad one, makes the answer malformed", async () => {
    const good = [{ name: "Publisher", kind: "agent", address: "/publisher" },
      { name: "Studio Team", kind: "agent_team", address: "/studio_team", description: "Writes" }, { name: "Blank", kind: "agent", address: "/blank", description: " " }];
    const f = client(async () => answer({ accepted: true, nodeId: PEER.nodeId, agents: good }));
    // A blank description is left out by the one entry builder.
    await expect(f.client.listAvailableAgents(PEER.nodeId)).resolves.toEqual({ accepted: true, agents: [good[0], good[1], { name: "Blank", kind: "agent", address: "/blank" }] });
    const malformed = [
      { agents: [{ ...good[1], members: [{ address: "/studio_team/lead" }] }] },
      { agents: [{ ...good[0], launchConfiguration: { runtimeKind: "codex" } }] },
      { agents: [{ name: "Org", kind: "agent_org", address: "/org" }] },
      { agents: [{ name: "No address", kind: "agent" }] },
      { agents: [{ name: "Relative", kind: "agent", address: "publisher" }] },
      { agents: [{ ...good[0], description: 3 }] },
      { agents: [null] },
      { agents: { publisher: good[0] } },
      {},
    ];
    for (const body of malformed) {
      const m = client(async () => answer({ accepted: true, nodeId: PEER.nodeId, ...body }));
      await expect(m.client.listAvailableAgents(PEER.nodeId), JSON.stringify(body)).resolves.toEqual({ accepted: false, code: "PEER_UNREACHABLE",
        message: 'Node "docker" could not be reached (it answered without its list).' });
    }
  });

  it("refuses an answer from a server that is not the pinned peer (identity mismatch)", async () => {
    const f = client(async () => answer({ accepted: true, nodeId: "srv_someone_else" }));
    await expect(f.client.deliverMessage(message)).resolves.toMatchObject({ accepted: false, code: "PEER_IDENTITY_MISMATCH" });
  });

  it("words a peer's refusal for the agent, naming the peer by this owner's label", async () => {
    const f = client(async () => answer({ accepted: false, nodeId: PEER.nodeId, code: "AGENT_CANNOT_RUN", message: "The model 'x' is not available on codex.",
      target: { kind: "agent", name: "Publisher" } }));
    await expect(f.client.startDelegatedRun(start)).resolves.toEqual({ accepted: false, code: "AGENT_CANNOT_RUN",
      message: `The Agent Publisher on node "docker" cannot run there: The model 'x' is not available on codex.` });
    // autobyteus-261 DEC-407: the target's kind words the text; a malformed target is left out.
    const team = client(async () => answer({ accepted: false, nodeId: PEER.nodeId, code: "AGENT_CANNOT_RUN", message: "the Agent Team changed while it was being started.",
      target: { kind: "agent_team", name: "Studio Team" } }));
    await expect(team.client.startDelegatedRun(start)).resolves.toMatchObject({
      message: `The Agent Team Studio Team on node "docker" cannot run there: the Agent Team changed while it was being started.` });
    const odd = client(async () => answer({ accepted: false, nodeId: PEER.nodeId, code: "AGENT_CANNOT_RUN", message: "x", target: { kind: "agent_org", name: "Org" } }));
    await expect(odd.client.startDelegatedRun(start)).resolves.toMatchObject({ message: `The Agent at that address on node "docker" cannot run there: x` });
  });

  it("maps a transport failure, an HTTP error and a timeout to PEER_UNREACHABLE within the bound (QR-102)", async () => {
    const down = client(async () => { throw new TypeError("fetch failed"); });
    await expect(down.client.startDelegatedRun(start)).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE", message: expect.stringContaining('Node "docker" could not be reached') });
    const broken = client(async () => answer({}, 500));
    await expect(broken.client.deliverMessage(message)).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE", message: expect.stringContaining("HTTP 500") });
    const slow = client((_url, init) => new Promise((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(init.signal!.reason))), { timeoutMs: 20 });
    const startedAt = Date.now();
    await expect(slow.client.deliverMessage(message)).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE",
      message: expect.stringContaining("may have been delivered") });
    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });

  it("sends nothing while the switch is off, or to a peer that is not registered", async () => {
    const off = client(async () => answer({}), { enabled: false });
    await expect(off.client.findPeer("docker")).resolves.toMatchObject({ accepted: false, code: "REMOTE_COLLABORATION_OFF" });
    await expect(off.client.deliverMessage(message)).resolves.toMatchObject({ accepted: false, code: "REMOTE_COLLABORATION_OFF" });
    const on = client(async () => answer({}));
    await expect(on.client.findPeer("nas")).resolves.toMatchObject({ accepted: false, code: "PEER_NOT_REGISTERED", message: expect.stringContaining('"nas"') });
    await expect(on.client.deliverMessage({ ...message, nodeId: "srv_removed" })).resolves.toMatchObject({ accepted: false, code: "PEER_NOT_REGISTERED" });
    expect(off.fetch).not.toHaveBeenCalled();
    expect(on.fetch).not.toHaveBeenCalled();
    await expect(on.client.findPeer("docker")).resolves.toEqual({ nodeId: PEER.nodeId, name: "docker" });
  });

  it("reads a URL's server identity from its public status route, and refuses what is not an AutoByteus node", async () => {
    const node = client(async () => answer({ nodeId: PEER.nodeId }));
    await expect(node.client.fetchNodeId("http://peer:29700")).resolves.toBe(PEER.nodeId);
    expect(node.fetch.mock.calls[0]![0]).toBe("http://peer:29700/rest/remote-access/status");
    const other = client(async () => answer({ hello: "world" }));
    await expect(other.client.fetchNodeId("http://web")).rejects.toMatchObject({ code: "PEER_NOT_AUTOBYTEUS" });
    const down = client(async () => { throw new TypeError("fetch failed"); });
    await expect(down.client.fetchNodeId("http://down")).rejects.toMatchObject({ code: "PEER_UNREACHABLE" });
  });

  it("one-nodes-tab REQ-707: an identity probe that gets no answer names its cause, never 'fetch failed'", async () => {
    const refused = client(async () => { throw Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }) }); });
    await expect(refused.client.fetchNodeId("http://localhost:8003")).rejects.toMatchObject({ code: "PEER_UNREACHABLE",
      message: "http://localhost:8003 could not be reached: nothing answers at that address and port.",
      details: { reason: "refused", address: "http://localhost:8003" } });
    const unknownHost = client(async () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } }); });
    await expect(unknownHost.client.fetchNodeId("http://nas.local:29695")).rejects.toMatchObject({ details: { reason: "not_found" } });
    const slow = client((_url, init) => new Promise((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(init.signal!.reason))), { timeoutMs: 20 });
    await expect(slow.client.fetchNodeId("http://blackhole")).rejects.toMatchObject({ details: { reason: "timeout" },
      message: "http://blackhole could not be reached: it did not answer in time." });
    for (const error of [refused, unknownHost, slow]) expect(JSON.stringify(error.fetch.mock.calls.length)).toBe("1");
  });

  it("one-nodes-tab REQ-707: an unreachable peer's refusal carries the reason; the agent's text is unchanged", async () => {
    const refused = client(async () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } }); });
    await expect(refused.client.checkAvailability(PEER.nodeId)).resolves.toEqual({ accepted: false, code: "PEER_UNREACHABLE", reason: "refused",
      message: 'Node "docker" could not be reached (fetch failed).' });
    const broken = client(async () => answer({}, 500));
    const answered = await broken.client.listAvailableAgents(PEER.nodeId);
    expect(answered).toMatchObject({ accepted: false, code: "PEER_UNREACHABLE" });
    expect("reason" in answered).toBe(false);
  });

  it("calls a server that answered with a page, or with another status, not an AutoByteus node, never unreachable (CR-002)", async () => {
    const page = client(async () => ({ ok: true, status: 200, json: async () => JSON.parse("<!DOCTYPE html><html></html>") }));
    await expect(page.client.fetchNodeId("http://127.0.0.1:3000"))
      .rejects.toMatchObject({ code: "PEER_NOT_AUTOBYTEUS", message: "http://127.0.0.1:3000 is not an AutoByteus node." });
    const missing = client(async () => ({ ok: false, status: 404, json: async () => { throw new Error("no body"); } }));
    await expect(missing.client.fetchNodeId("http://127.0.0.1:8080"))
      .rejects.toMatchObject({ code: "PEER_NOT_AUTOBYTEUS", message: "http://127.0.0.1:8080 is not an AutoByteus node." });
    const slowBody = client(async () => ({ ok: true, status: 200, json: async () => { throw Object.assign(new Error("aborted"), { name: "TimeoutError" }); } }));
    await expect(slowBody.client.fetchNodeId("http://slow")).rejects.toMatchObject({ code: "PEER_UNREACHABLE" });
  });
});
