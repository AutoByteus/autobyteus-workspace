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

const start = { nodeId: PEER.nodeId, publishedAddress: "/publisher", delegatorAgentRunId: "agent_a1", coordinatingRun: { kind: "agent" as const, runId: "agent_a1" } };
const message = {
  nodeId: PEER.nodeId, kind: "message" as const, messageId: "collabmsg_1", senderAgentRunId: "agent_a1", targetAgentRunId: "publisher_7f3",
  content: "hi", messageType: "agent_message", createdAt: "2026-10-20T10:00:00.000Z",
};

describe("PeerClient", () => {
  it("sends the envelope and the request to the peer's pinned URL, with no credential, and returns the peer's run ID", async () => {
    const f = client(async () => answer({ accepted: true, nodeId: PEER.nodeId, agentRunId: "publisher_7f3" }));
    await expect(f.client.startDelegatedRun(start)).resolves.toEqual({ accepted: true, agentRunId: "publisher_7f3" });
    const [url, init] = f.fetch.mock.calls[0]!;
    expect(url).toBe("http://peer:29700/rest/remote/delegated-runs");
    expect(JSON.parse(String(init.body))).toEqual({ fromNodeId: SELF, toNodeId: PEER.nodeId, publishedAddress: "/publisher",
      delegator: { agentRunId: "agent_a1" }, coordinatingRun: { kind: "agent", runId: "agent_a1" } });
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("refuses an answer from a server that is not the pinned peer (identity mismatch)", async () => {
    const f = client(async () => answer({ accepted: true, nodeId: "srv_someone_else" }));
    await expect(f.client.deliverMessage(message)).resolves.toMatchObject({ accepted: false, code: "PEER_IDENTITY_MISMATCH" });
  });

  it("words a peer's refusal for the agent, naming the peer by this owner's label", async () => {
    const f = client(async () => answer({ accepted: false, nodeId: PEER.nodeId, code: "PUBLISHED_AGENT_CANNOT_RUN", message: "The model 'x' is not available on codex." }));
    await expect(f.client.startDelegatedRun(start)).resolves.toEqual({ accepted: false, code: "PUBLISHED_AGENT_CANNOT_RUN",
      message: `The published Agent on node "docker" cannot run there: The model 'x' is not available on codex.` });
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
    const node = client(async () => answer({ serverInstanceId: PEER.nodeId }));
    await expect(node.client.fetchServerInstanceId("http://peer:29700")).resolves.toBe(PEER.nodeId);
    expect(node.fetch.mock.calls[0]![0]).toBe("http://peer:29700/rest/remote-access/status");
    const other = client(async () => answer({ hello: "world" }));
    await expect(other.client.fetchServerInstanceId("http://web")).rejects.toMatchObject({ code: "PEER_NOT_AUTOBYTEUS" });
    const down = client(async () => { throw new TypeError("fetch failed"); });
    await expect(down.client.fetchServerInstanceId("http://down")).rejects.toMatchObject({ code: "PEER_UNREACHABLE" });
  });

  it("calls a server that answered with a page, or with another status, not an AutoByteus node, never unreachable (CR-002)", async () => {
    const page = client(async () => ({ ok: true, status: 200, json: async () => JSON.parse("<!DOCTYPE html><html></html>") }));
    await expect(page.client.fetchServerInstanceId("http://127.0.0.1:3000"))
      .rejects.toMatchObject({ code: "PEER_NOT_AUTOBYTEUS", message: "http://127.0.0.1:3000 is not an AutoByteus node." });
    const missing = client(async () => ({ ok: false, status: 404, json: async () => { throw new Error("no body"); } }));
    await expect(missing.client.fetchServerInstanceId("http://127.0.0.1:8080"))
      .rejects.toMatchObject({ code: "PEER_NOT_AUTOBYTEUS", message: "http://127.0.0.1:8080 is not an AutoByteus node." });
    const slowBody = client(async () => ({ ok: true, status: 200, json: async () => { throw Object.assign(new Error("aborted"), { name: "TimeoutError" }); } }));
    await expect(slowBody.client.fetchServerInstanceId("http://slow")).rejects.toMatchObject({ code: "PEER_UNREACHABLE" });
  });
});
