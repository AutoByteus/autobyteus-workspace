import { describe, expect, it, vi } from "vitest";
import { PeerGateway } from "../../../src/remote-collaboration/channel/peer-gateway.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";

/** Design § Contract Between Nodes: the gateway's fixed admission order (REQ-114, AC-101, AC-102, AC-111). */

const SELF = "srv_self_node_000000000000000000000000";
const PEER: PeerNode = { nodeId: "srv_peer_node_000000000000000000000000", name: "desktop", baseUrl: "http://a", addedAt: "2026-10-20T09:00:00.000Z" };

const startBody = (overrides: Record<string, unknown> = {}) => ({
  fromNodeId: PEER.nodeId, toNodeId: SELF, address: "/publisher",
  delegator: { agentRunId: "agent_a1" }, coordinatingRun: { kind: "agent", runId: "agent_a1" },
  task: { text: "Publish the video draft.", title: "Publish the video draft.", taskKey: null, projectId: null, taskId: null }, ...overrides,
});
const messageBody = (overrides: Record<string, unknown> = {}) => ({
  fromNodeId: PEER.nodeId, toNodeId: SELF, kind: "message", messageId: "collabmsg_1",
  sender: { agentRunId: "agent_a1" }, targetRoot: { kind: "agent", runId: "publisher_7f3" }, target: { agentRunId: "publisher_7f3" },
  content: "hello", messageType: "agent_message", createdAt: "2026-10-20T10:00:00.000Z", ...overrides,
});

const gateway = (input: { enabled?: boolean; registered?: boolean } = {}) => {
  const delegatedRuns = { start: vi.fn(async () => ({ accepted: true as const, kind: "agent" as const, agentRunId: "publisher_7f3" })) };
  const messages = { accept: vi.fn(async () => ({ accepted: true as const })) };
  const availableAgents = { list: vi.fn(async () => ({ accepted: true as const, agents: [{ name: "Publisher", kind: "agent" as const, address: "/publisher" }] })) };
  const gate = new PeerGateway({
    ownNodeId: async () => SELF,
    capability: { isEnabled: () => input.enabled ?? true },
    peers: { findByNodeId: async (nodeId) => (input.registered ?? true) && nodeId === PEER.nodeId ? PEER : null },
    delegatedRuns,
    messages,
    availableAgents,
  });
  return { gate, delegatedRuns, messages, availableAgents };
};

describe("PeerGateway", () => {
  it("dispatches an admitted request to the one handler of its kind, with the calling peer; every answer names this node", async () => {
    const f = gateway();
    await expect(f.gate.startDelegatedRun(startBody())).resolves.toEqual({ status: 200, answer: { accepted: true, kind: "agent", agentRunId: "publisher_7f3", nodeId: SELF } });
    expect(f.delegatedRuns.start).toHaveBeenCalledWith(expect.objectContaining({ address: "/publisher", delegator: { agentRunId: "agent_a1" } }), PEER);
    await expect(f.gate.deliverMessage(messageBody())).resolves.toEqual({ status: 200, answer: { accepted: true, nodeId: SELF } });
    expect(f.messages.accept).toHaveBeenCalledWith(expect.objectContaining({ kind: "message", messageId: "collabmsg_1",
      targetRoot: { kind: "agent", runId: "publisher_7f3" } }), PEER);
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
    // autobyteus-247 G-2: every message and work packet names its root on this node.
    await expect(f.gate.deliverMessage(messageBody({ targetRoot: { kind: "nope", runId: "x" } }))).resolves.toMatchObject({ status: 400 });
    await expect(f.gate.deliverMessage(messageBody({ targetRoot: undefined }))).resolves.toMatchObject({ status: 400 });
    await expect(f.gate.deliverMessage(messageBody({ kind: "work_packet", messageId: undefined, targetRoot: undefined }))).resolves.toMatchObject({ status: 400 });
    expect(f.messages.accept).not.toHaveBeenCalled();
  });

  it("passes a handler's refusal through with this node's ID", async () => {
    const f = gateway();
    f.messages.accept.mockResolvedValueOnce({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED", message: "not linked" } as never);
    await expect(f.gate.deliverMessage(messageBody())).resolves.toEqual({ status: 200,
      answer: { accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED", message: "not linked", nodeId: SELF } });
  });

  it("autobyteus-261: availability is the admission itself; available agents dispatch to the one lister; both name this node", async () => {
    const envelope = { fromNodeId: PEER.nodeId, toNodeId: SELF };
    const f = gateway();
    await expect(f.gate.checkAvailability(envelope)).resolves.toEqual({ status: 200, answer: { accepted: true, nodeId: SELF } });
    await expect(f.gate.listAvailableAgents(envelope)).resolves.toEqual({ status: 200,
      answer: { accepted: true, nodeId: SELF, agents: [{ name: "Publisher", kind: "agent", address: "/publisher" }] } });
    expect(f.availableAgents.list).toHaveBeenCalledOnce();
  });

  it("autobyteus-261: both kinds keep the admission order (target node, switch, registration) and refuse a malformed body", async () => {
    const envelope = { fromNodeId: PEER.nodeId, toNodeId: SELF };
    for (const call of ["checkAvailability", "listAvailableAgents"] as const) {
      await expect(gateway().gate[call]({ ...envelope, toNodeId: "srv_other" })).resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_IDENTITY_MISMATCH", nodeId: SELF } });
      await expect(gateway({ enabled: false }).gate[call](envelope)).resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "REMOTE_COLLABORATION_OFF" } });
      await expect(gateway({ registered: false }).gate[call](envelope)).resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_NOT_REGISTERED" } });
      await expect(gateway().gate[call]({ fromNodeId: PEER.nodeId })).resolves.toMatchObject({ status: 400, answer: { accepted: false, code: "REMOTE_REQUEST_INVALID" } });
      await expect(gateway().gate[call]("not an object")).resolves.toMatchObject({ status: 400 });
    }
    const refused = gateway({ enabled: false });
    await refused.gate.listAvailableAgents(envelope);
    expect(refused.availableAgents.list).not.toHaveBeenCalled();
  });
});
