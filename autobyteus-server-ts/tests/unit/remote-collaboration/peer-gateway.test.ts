import { describe, expect, it, vi } from "vitest";
import { PeerGateway } from "../../../src/remote-collaboration/channel/peer-gateway.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";

/** Design § Contract Between Nodes: the gateway's fixed admission order (REQ-114, AC-101, AC-102, AC-111). */

const SELF = "srv_self_node_000000000000000000000000";
const PEER: PeerNode = { nodeId: "srv_peer_node_000000000000000000000000", name: "desktop", baseUrl: "http://a", addedAt: "2026-10-20T09:00:00.000Z" };

const startBody = (overrides: Record<string, unknown> = {}) => ({
  fromNodeId: PEER.nodeId, toNodeId: SELF, address: "/publisher",
  delegator: { agentRunId: "agent_a1" }, coordinatingRun: { kind: "agent", runId: "agent_a1" }, ...overrides,
});
const messageBody = (overrides: Record<string, unknown> = {}) => ({
  fromNodeId: PEER.nodeId, toNodeId: SELF, kind: "message", messageId: "collabmsg_1",
  sender: { agentRunId: "agent_a1" }, target: { agentRunId: "publisher_7f3" },
  content: "hello", messageType: "agent_message", createdAt: "2026-10-20T10:00:00.000Z", ...overrides,
});

const gateway = (input: { enabled?: boolean; registered?: boolean } = {}) => {
  const delegatedRuns = { start: vi.fn(async () => ({ accepted: true as const, agentRunId: "publisher_7f3" })) };
  const messages = { accept: vi.fn(async () => ({ accepted: true as const })) };
  const gate = new PeerGateway({
    ownNodeId: async () => SELF,
    capability: { isEnabled: () => input.enabled ?? true },
    peers: { findByNodeId: async (nodeId) => (input.registered ?? true) && nodeId === PEER.nodeId ? PEER : null },
    delegatedRuns,
    messages,
  });
  return { gate, delegatedRuns, messages };
};

describe("PeerGateway", () => {
  it("dispatches an admitted request to the one handler of its kind, with the calling peer; every answer names this node", async () => {
    const f = gateway();
    await expect(f.gate.startDelegatedRun(startBody())).resolves.toEqual({ status: 200, answer: { accepted: true, agentRunId: "publisher_7f3", nodeId: SELF } });
    expect(f.delegatedRuns.start).toHaveBeenCalledWith(expect.objectContaining({ address: "/publisher", delegator: { agentRunId: "agent_a1" } }), PEER);
    await expect(f.gate.deliverMessage(messageBody())).resolves.toEqual({ status: 200, answer: { accepted: true, nodeId: SELF } });
    expect(f.messages.accept).toHaveBeenCalledWith(expect.objectContaining({ kind: "message", messageId: "collabmsg_1" }), PEER);
  });

  it("checks the target node first, then the switch, then the peer registration, before any dispatch", async () => {
    const misaddressed = gateway({ enabled: false, registered: false });
    await expect(misaddressed.gate.deliverMessage(messageBody({ toNodeId: "srv_other" })))
      .resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_IDENTITY_MISMATCH", nodeId: SELF } });
    const off = gateway({ enabled: false, registered: false });
    await expect(off.gate.startDelegatedRun(startBody()))
      .resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "REMOTE_COLLABORATION_OFF", nodeId: SELF } });
    const unregistered = gateway({ registered: false });
    await expect(unregistered.gate.deliverMessage(messageBody()))
      .resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_NOT_REGISTERED", nodeId: SELF } });
    for (const f of [misaddressed, off, unregistered]) {
      expect(f.delegatedRuns.start).not.toHaveBeenCalled();
      expect(f.messages.accept).not.toHaveBeenCalled();
    }
  });

  it("answers 400 for a malformed body and dispatches nothing", async () => {
    const f = gateway();
    await expect(f.gate.startDelegatedRun({ fromNodeId: PEER.nodeId })).resolves.toMatchObject({ status: 400, answer: { accepted: false, code: "REMOTE_REQUEST_INVALID" } });
    await expect(f.gate.deliverMessage(messageBody({ kind: "attachment" }))).resolves.toMatchObject({ status: 400 });
    await expect(f.gate.deliverMessage(messageBody({ messageId: undefined }))).resolves.toMatchObject({ status: 400 });
    await expect(f.gate.deliverMessage(messageBody({ coordinatingRun: { kind: "nope", runId: "x" } }))).resolves.toMatchObject({ status: 400 });
    expect(f.messages.accept).not.toHaveBeenCalled();
  });

  it("passes a handler's refusal through with this node's ID", async () => {
    const f = gateway();
    f.messages.accept.mockResolvedValueOnce({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED", message: "not linked" } as never);
    await expect(f.gate.deliverMessage(messageBody())).resolves.toEqual({ status: 200,
      answer: { accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED", message: "not linked", nodeId: SELF } });
  });
});
