import { describe, expect, it, vi } from "vitest";
import { PeerClient } from "../../../src/remote-collaboration/channel/peer-client.js";
import type { PeerWebSocket } from "../../../src/remote-collaboration/channel/peer-run-observation-client.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";

/** autobyteus-278: the delegating node's outbound calls about runs its delegation started (§ Interface Boundary Mapping). */

const SELF = "srv_self_node_000000000000000000000000";
const PEER: PeerNode = { nodeId: "srv_peer_node_000000000000000000000000", name: "docker", baseUrl: "http://peer:29700", addedAt: "2026-10-20T09:00:00.000Z" };
const answer = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const TEAM = { kind: "agent_team" as const, runId: "team-run" };

class FakeSocket implements PeerWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readonly sent: unknown[] = [];
  closed = false;
  constructor(readonly url: string) {}
  send(data: string) { this.sent.push(JSON.parse(data)); }
  close() { this.closed = true; }
  receive(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) }); }
}

const client = (fetchImpl?: (url: string, init: RequestInit) => Promise<ReturnType<typeof answer>>, options: { enabled?: boolean } = {}) => {
  const fetch = vi.fn(fetchImpl ?? (async () => answer({})));
  const sockets: FakeSocket[] = [];
  return {
    fetch, sockets,
    client: new PeerClient({
      peers: { findByName: async () => PEER, findByNodeId: async (nodeId) => nodeId === PEER.nodeId ? PEER : null },
      capability: { isEnabled: () => options.enabled ?? true },
      ownNodeId: async () => SELF,
      timeoutMs: 50,
      fetch: fetch as never,
      openWebSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; },
    }),
  };
};
const flush = async () => { for (let index = 0; index < 5; index += 1) await Promise.resolve(); };
const statusMessage = { type: "AGENT_STATUS", payload: { status: "running", trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null } };

describe("PeerClient run views (autobyteus-278)", () => {
  it("asks one node for its runs' summaries and reads the answer strictly", async () => {
    const runs = [{ kind: "agent_team", runId: "team-run", title: "Plan the October campaign", statuses: [{ agentRunId: "lead-run", status: "running" }] }];
    const f = client(async () => answer({ accepted: true, nodeId: PEER.nodeId, runs }));
    await expect(f.client.runSummaries(PEER.nodeId, [TEAM])).resolves.toEqual({ accepted: true, runs });
    const [url, init] = f.fetch.mock.calls[0]!;
    expect(url).toBe("http://peer:29700/rest/remote/run-summaries");
    expect(JSON.parse(String(init.body))).toEqual({ fromNodeId: SELF, toNodeId: PEER.nodeId, runs: [TEAM] });
    for (const bad of [{ ...runs[0], statuses: [{ agentRunId: "lead-run", status: "waiting" }] }, { ...runs[0], title: 7 }, { ...runs[0], kind: "agent_org" }]) {
      const g = client(async () => answer({ accepted: true, nodeId: PEER.nodeId, runs: [bad] }));
      await expect(g.client.runSummaries(PEER.nodeId, [TEAM])).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE" });
    }
  });

  it("reads one agent's projection and passes an owner command; refusals stay refusals", async () => {
    const projection = { agentRunId: "lead-run", conversation: [{ kind: "message" }], activities: [], summary: "Plan", lastActivityAt: null, hasEarlierActiveTraceEvents: false };
    const f = client(async (url) => answer(url.endsWith("/agent-projection")
      ? { accepted: true, nodeId: PEER.nodeId, projection }
      : { accepted: false, nodeId: PEER.nodeId, code: "TARGET_NOT_PERMITTED", message: "That run was not started by the calling node's delegation." }));
    await expect(f.client.agentProjection(PEER.nodeId, TEAM, "lead-run")).resolves.toEqual({ accepted: true, projection });
    expect(JSON.parse(String(f.fetch.mock.calls[0]![1].body))).toEqual({ fromNodeId: SELF, toNodeId: PEER.nodeId, targetRoot: TEAM, agentRunId: "lead-run" });
    const command = { kind: "post_message" as const, content: "status?", messageId: "m1", dedupeKey: "d1" };
    await expect(f.client.ownerCommand(PEER.nodeId, TEAM, "lead-run", command)).resolves.toMatchObject({ accepted: false, code: "TARGET_NOT_PERMITTED" });
    expect(f.fetch.mock.calls[1]![0]).toBe("http://peer:29700/rest/remote/owner-commands");
    expect(JSON.parse(String(f.fetch.mock.calls[1]![1].body))).toEqual({ fromNodeId: SELF, toNodeId: PEER.nodeId, targetRoot: TEAM, agentRunId: "lead-run", command });
  });

  it("N-401: an observation accepts frames only after the first frame names the pinned node; close() ends it silently", async () => {
    const f = client();
    const observer = { onFrame: vi.fn(), onEnd: vi.fn() };
    const stream = f.client.observeRun(PEER.nodeId, TEAM, observer);
    await flush();
    const socket = f.sockets[0]!;
    expect(socket.url).toBe("ws://peer:29700/rest/remote/run-observations");
    socket.onopen?.();
    expect(socket.sent).toEqual([{ fromNodeId: SELF, toNodeId: PEER.nodeId, targetRoot: TEAM }]);
    socket.receive({ nodeId: PEER.nodeId });
    socket.receive({ agentRunId: "lead-run", message: statusMessage });
    socket.receive({ agentRunId: "lead-run", message: { type: "NOT_A_MESSAGE", payload: {} } });
    expect(observer.onFrame.mock.calls).toEqual([["lead-run", statusMessage]]);
    stream.close();
    socket.onclose?.();
    expect(socket.closed).toBe(true);
    expect(observer.onEnd).not.toHaveBeenCalled();
  });

  it("a refusal, another node's first frame, no first frame in time or the peer closing ends the stream once", async () => {
    for (const first of [{ accepted: false, nodeId: PEER.nodeId, code: "TARGET_NOT_PERMITTED", message: "no" }, { nodeId: "srv_other" },
      { agentRunId: "lead-run", message: statusMessage }]) {
      const f = client();
      const observer = { onFrame: vi.fn(), onEnd: vi.fn() };
      f.client.observeRun(PEER.nodeId, TEAM, observer);
      await flush();
      f.sockets[0]!.receive(first);
      f.sockets[0]!.onclose?.();
      expect(observer.onEnd).toHaveBeenCalledTimes(1);
      expect(observer.onFrame).not.toHaveBeenCalled();
    }
    const silent = client();
    const silentObserver = { onFrame: vi.fn(), onEnd: vi.fn() };
    silent.client.observeRun(PEER.nodeId, TEAM, silentObserver);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(silentObserver.onEnd).toHaveBeenCalledTimes(1);
    const off = client(undefined, { enabled: false });
    const offObserver = { onFrame: vi.fn(), onEnd: vi.fn() };
    off.client.observeRun(PEER.nodeId, TEAM, offObserver);
    await flush();
    expect(off.sockets).toEqual([]);
    expect(offObserver.onEnd).toHaveBeenCalledTimes(1);
  });
});
