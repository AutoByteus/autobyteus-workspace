import { describe, expect, it, vi } from "vitest";
import { PeerGateway } from "../../../src/remote-collaboration/channel/peer-gateway.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";
import type { ClientIdentity } from "../../../src/node-access/domain/client-identity.js";

/** Design § Contract Between Nodes: the gateway's fixed admission order (REQ-114, AC-101, AC-102, AC-111). */

const SELF = "srv_self_node_000000000000000000000000";
const PEER: PeerNode = { nodeId: "srv_peer_node_000000000000000000000000", name: "desktop", baseUrl: "http://a", addedAt: "2026-10-20T09:00:00.000Z", paired: true };
/** The identity the node access gate established from the request's signature (node access model NA-9). */
const PEER_CALLER: ClientIdentity = { kind: "peer", nodeId: PEER.nodeId };

const startBody = (overrides: Record<string, unknown> = {}) => ({
  fromNodeId: PEER.nodeId, toNodeId: SELF, address: "/publisher",
  delegator: { agentRunId: "agent_a1" }, delegatingRun: { kind: "agent", runId: "agent_a1" },
  task: { text: "Publish the video draft.", title: "Publish the video draft.", taskKey: null, projectId: null, taskId: null }, ...overrides,
});
const messageBody = (overrides: Record<string, unknown> = {}) => ({
  fromNodeId: PEER.nodeId, toNodeId: SELF, kind: "message", messageId: "collabmsg_1",
  sender: { agentRunId: "agent_a1", address: "/assistant" }, targetRoot: { kind: "agent", runId: "publisher_7f3" }, target: { agentRunId: "publisher_7f3" },
  content: "hello", messageType: "agent_message", createdAt: "2026-10-20T10:00:00.000Z", ...overrides,
});

const gateway = (input: { enabled?: boolean; registered?: boolean } = {}) => {
  const delegatedRuns = { start: vi.fn(async () => ({ accepted: true as const, kind: "agent" as const, agentRunId: "publisher_7f3" })) };
  const messages = { accept: vi.fn(async () => ({ accepted: true as const, receiverAddress: "/publisher" })), acceptRunMessage: vi.fn(async () => ({ accepted: true as const, receiverAddress: null })) };
  const runningAgents = { list: vi.fn(async () => ({ accepted: true as const, agents: [{ kind: "agent" as const, name: "PM", agent_run_id: "pm_b", state: "idle" as const }] })) };
  const availableAgents = { list: vi.fn(async () => ({ accepted: true as const, agents: [{ name: "Publisher", kind: "agent" as const, address: "/publisher" }] })) };
  const delegatedRunStates = { apply: vi.fn(async (request: { open: boolean }) => ({ accepted: true as const, open: request.open })) };
  const peerRunMembers = { apply: vi.fn(async () => ({ accepted: true as const })) };
  const gate = new PeerGateway({
    ownNodeId: async () => SELF,
    capability: { isEnabled: () => input.enabled ?? true },
    peers: { findByNodeId: async (nodeId) => (input.registered ?? true) && nodeId === PEER.nodeId ? PEER : null },
    delegatedRuns,
    messages,
    availableAgents,
    runningAgents,
    runViews: {} as never,
    delegatedRunStates,
    peerRunMembers,
  });
  return { gate, delegatedRuns, messages, availableAgents, runningAgents, delegatedRunStates, peerRunMembers };
};

describe("PeerGateway", () => {
  it("autobyteus-591 DN-2, NAS-41: a delegated run's state goes to its handler with the calling peer; a malformed one is refused before it", async () => {
    const f = gateway();
    const body = { fromNodeId: PEER.nodeId, toNodeId: SELF, run: { kind: "agent_team", runId: "studio_team_b" }, open: false };
    await expect(f.gate.deliveredRunState(body, PEER_CALLER)).resolves.toEqual({ status: 200, answer: { accepted: true, open: false, nodeId: SELF } });
    expect(f.delegatedRunStates.apply).toHaveBeenCalledWith(expect.objectContaining({ run: { kind: "agent_team", runId: "studio_team_b" }, open: false }), PEER);
    for (const bad of [{ ...body, open: "no" }, { ...body, run: { kind: "agent_org", runId: "org_1" } }, { ...body, run: undefined }]) {
      await expect(f.gate.deliveredRunState(bad, PEER_CALLER)).resolves.toMatchObject({ answer: { accepted: false, nodeId: SELF } });
    }
    expect(f.delegatedRunStates.apply).toHaveBeenCalledOnce();
    // Not registered: refused before the handler, as every request.
    const unregistered = gateway({ registered: false });
    await expect(unregistered.gate.deliveredRunState(body, PEER_CALLER)).resolves.toMatchObject({ answer: { accepted: false, code: "PEER_NOT_REGISTERED" } });
    expect(unregistered.delegatedRunStates.apply).not.toHaveBeenCalled();
  });

  it("FU-003 (org-teams-follow-definition DS-007): a Team run's members go to their handler with the calling peer; a malformed one is refused before it", async () => {
    const f = gateway();
    const body = { fromNodeId: PEER.nodeId, toNodeId: SELF, run: { kind: "agent_team", runId: "studio_team_b" }, coordinatorAddress: "/lead",
      members: [{ address: "/lead", agentRunId: "lead_b" }, { address: "/writer", agentRunId: "writer_b" }] };
    await expect(f.gate.peerRunMembers(body, PEER_CALLER)).resolves.toEqual({ status: 200, answer: { accepted: true, nodeId: SELF } });
    expect(f.peerRunMembers.apply).toHaveBeenCalledWith(expect.objectContaining({ run: { kind: "agent_team", runId: "studio_team_b" }, coordinatorAddress: "/lead",
      members: body.members }), PEER);
    for (const bad of [{ ...body, members: "x" }, { ...body, coordinatorAddress: "" }, { ...body, members: [{ address: "/lead" }] }, { ...body, run: undefined }]) {
      await expect(f.gate.peerRunMembers(bad, PEER_CALLER)).resolves.toMatchObject({ answer: { accepted: false, nodeId: SELF } });
    }
    expect(f.peerRunMembers.apply).toHaveBeenCalledOnce();
  });

  it("dispatches an admitted request to the one handler of its kind, with the calling peer; every answer names this node", async () => {
    const f = gateway();
    await expect(f.gate.startDelegatedRun(startBody(), PEER_CALLER)).resolves.toEqual({ status: 200, answer: { accepted: true, kind: "agent", agentRunId: "publisher_7f3", nodeId: SELF } });
    expect(f.delegatedRuns.start).toHaveBeenCalledWith(expect.objectContaining({ address: "/publisher", delegator: { agentRunId: "agent_a1" } }), PEER);
    // autobyteus-565: the answer names the receiving agent's address, for the sender's line.
    await expect(f.gate.deliverMessage(messageBody(), PEER_CALLER)).resolves.toEqual({ status: 200, answer: { accepted: true, nodeId: SELF, receiverAddress: "/publisher" } });
    expect(f.messages.accept).toHaveBeenCalledWith(expect.objectContaining({ kind: "message", messageId: "collabmsg_1",
      targetRoot: { kind: "agent", runId: "publisher_7f3" } }), PEER);
  });

  it("checks the target node first, then the switch, then the peer registration, before any dispatch", async () => {
    const misaddressed = gateway({ enabled: false, registered: false });
    await expect(misaddressed.gate.deliverMessage(messageBody({ toNodeId: "srv_other" }), PEER_CALLER))
      .resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_IDENTITY_MISMATCH", nodeId: SELF } });
    const off = gateway({ enabled: false, registered: false });
    await expect(off.gate.startDelegatedRun(startBody(), PEER_CALLER))
      .resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "REMOTE_COLLABORATION_OFF", nodeId: SELF } });
    const unregistered = gateway({ registered: false });
    await expect(unregistered.gate.deliverMessage(messageBody(), PEER_CALLER))
      .resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_NOT_REGISTERED", nodeId: SELF } });
    for (const f of [misaddressed, off, unregistered]) {
      expect(f.delegatedRuns.start).not.toHaveBeenCalled();
      expect(f.messages.accept).not.toHaveBeenCalled();
    }
  });

  it("NAS-21 refuses a request whose fromNodeId is not the peer its signature proved, before any dispatch", async () => {
    const f = gateway();
    const otherPeer: ClientIdentity = { kind: "peer", nodeId: "srv_other_peer_00000000000000000000000" };
    await expect(f.gate.startDelegatedRun(startBody(), otherPeer))
      .resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_IDENTITY_MISMATCH", nodeId: SELF } });
    await expect(f.gate.deliverMessage(messageBody(), { kind: "owner", credentialId: "launch" }))
      .resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_IDENTITY_MISMATCH" } });
    await expect(f.gate.checkAvailability({ fromNodeId: PEER.nodeId, toNodeId: SELF }, null))
      .resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_IDENTITY_MISMATCH" } });
    expect(f.delegatedRuns.start).not.toHaveBeenCalled();
    expect(f.messages.accept).not.toHaveBeenCalled();
  });

  it("answers 400 for a malformed body and dispatches nothing", async () => {
    const f = gateway();
    await expect(f.gate.startDelegatedRun({ fromNodeId: PEER.nodeId }, PEER_CALLER)).resolves.toMatchObject({ status: 400, answer: { accepted: false, code: "REMOTE_REQUEST_INVALID" } });
    await expect(f.gate.deliverMessage(messageBody({ kind: "attachment" }), PEER_CALLER)).resolves.toMatchObject({ status: 400 });
    await expect(f.gate.deliverMessage(messageBody({ messageId: undefined }), PEER_CALLER)).resolves.toMatchObject({ status: 400 });
    // autobyteus-247 G-2: every message and work packet names its root on this node.
    await expect(f.gate.deliverMessage(messageBody({ targetRoot: { kind: "nope", runId: "x" } }), PEER_CALLER)).resolves.toMatchObject({ status: 400 });
    await expect(f.gate.deliverMessage(messageBody({ targetRoot: undefined }), PEER_CALLER)).resolves.toMatchObject({ status: 400 });
    await expect(f.gate.deliverMessage(messageBody({ kind: "work_packet", messageId: undefined, targetRoot: undefined }), PEER_CALLER)).resolves.toMatchObject({ status: 400 });
    expect(f.messages.accept).not.toHaveBeenCalled();
  });

  it("passes a handler's refusal through with this node's ID", async () => {
    const f = gateway();
    f.messages.accept.mockResolvedValueOnce({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED", message: "not linked" } as never);
    await expect(f.gate.deliverMessage(messageBody(), PEER_CALLER)).resolves.toEqual({ status: 200,
      answer: { accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED", message: "not linked", nodeId: SELF } });
  });

  it("autobyteus-261: availability is the admission itself; available agents dispatch to the one lister; both name this node", async () => {
    const envelope = { fromNodeId: PEER.nodeId, toNodeId: SELF };
    const f = gateway();
    await expect(f.gate.checkAvailability(envelope, PEER_CALLER)).resolves.toEqual({ status: 200, answer: { accepted: true, nodeId: SELF } });
    await expect(f.gate.listAvailableAgents(envelope, PEER_CALLER)).resolves.toEqual({ status: 200,
      answer: { accepted: true, nodeId: SELF, agents: [{ name: "Publisher", kind: "agent", address: "/publisher" }] } });
    expect(f.availableAgents.list).toHaveBeenCalledOnce();
  });

  it("autobyteus-261: both kinds keep the admission order (target node, switch, registration) and refuse a malformed body", async () => {
    const envelope = { fromNodeId: PEER.nodeId, toNodeId: SELF };
    for (const call of ["checkAvailability", "listAvailableAgents"] as const) {
      await expect(gateway().gate[call]({ ...envelope, toNodeId: "srv_other" }, PEER_CALLER)).resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_IDENTITY_MISMATCH", nodeId: SELF } });
      await expect(gateway({ enabled: false }).gate[call](envelope, PEER_CALLER)).resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "REMOTE_COLLABORATION_OFF" } });
      await expect(gateway({ registered: false }).gate[call](envelope, PEER_CALLER)).resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_NOT_REGISTERED" } });
      await expect(gateway().gate[call]({ fromNodeId: PEER.nodeId }, PEER_CALLER)).resolves.toMatchObject({ status: 400, answer: { accepted: false, code: "REMOTE_REQUEST_INVALID" } });
      await expect(gateway().gate[call]("not an object", PEER_CALLER)).resolves.toMatchObject({ status: 400 });
    }
    const refused = gateway({ enabled: false });
    await refused.gate.listAvailableAgents(envelope, PEER_CALLER);
    expect(refused.availableAgents.list).not.toHaveBeenCalled();
  });

  describe("autobyteus-492: run-messages and running-agents", () => {
    const runMessageBody = (overrides: Record<string, unknown> = {}) => ({
      fromNodeId: PEER.nodeId, toNodeId: SELF, messageId: "collabmsg_9", sender: { agentRunId: "pm_a", address: "/project_task_manager" }, target: { agentRunId: "pm_b" },
      content: "hello B", messageType: "agent_message", createdAt: "2026-11-18T10:00:00.000Z", ...overrides,
    });

    it("a message by run ID is parsed without a root and handed to the receiver's acceptRunMessage, with the calling peer", async () => {
      const f = gateway();
      await expect(f.gate.deliverRunMessage(runMessageBody(), PEER_CALLER)).resolves.toEqual({ status: 200, answer: { accepted: true, nodeId: SELF, receiverAddress: null } });
      expect(f.messages.acceptRunMessage).toHaveBeenCalledWith({ fromNodeId: PEER.nodeId, toNodeId: SELF, messageId: "collabmsg_9",
        sender: { agentRunId: "pm_a", address: "/project_task_manager" }, target: { agentRunId: "pm_b" }, content: "hello B", messageType: "agent_message", createdAt: "2026-11-18T10:00:00.000Z" }, PEER);
      expect(f.messages.accept).not.toHaveBeenCalled();
    });

    it("a malformed message by run ID is 400; nothing is dispatched", async () => {
      const f = gateway();
      await expect(f.gate.deliverRunMessage(runMessageBody({ messageId: undefined }), PEER_CALLER)).resolves.toMatchObject({ status: 400,
        answer: { accepted: false, code: "REMOTE_REQUEST_INVALID" } });
      await expect(f.gate.deliverRunMessage(runMessageBody({ target: "pm_b" }), PEER_CALLER)).resolves.toMatchObject({ status: 400 });
      expect(f.messages.acceptRunMessage).not.toHaveBeenCalled();
    });

    it("QR-003: both new requests pass the same admission first: an unauthenticated caller, a switch off and an unregistered peer are refused before any handler", async () => {
      const f = gateway();
      await expect(f.gate.deliverRunMessage(runMessageBody(), null)).resolves.toMatchObject({ status: 200, answer: { accepted: false, code: "PEER_IDENTITY_MISMATCH" } });
      await expect(f.gate.listRunningAgents({ fromNodeId: PEER.nodeId, toNodeId: SELF }, null)).resolves.toMatchObject({ answer: { accepted: false, code: "PEER_IDENTITY_MISMATCH" } });
      await expect(gateway({ enabled: false }).gate.listRunningAgents({ fromNodeId: PEER.nodeId, toNodeId: SELF }, PEER_CALLER))
        .resolves.toMatchObject({ answer: { accepted: false, code: "REMOTE_COLLABORATION_OFF" } });
      await expect(gateway({ registered: false }).gate.deliverRunMessage(runMessageBody(), PEER_CALLER))
        .resolves.toMatchObject({ answer: { accepted: false, code: "PEER_NOT_REGISTERED" } });
      expect(f.messages.acceptRunMessage).not.toHaveBeenCalled();
      expect(f.runningAgents.list).not.toHaveBeenCalled();
    });

    it("the running runs: the envelope only, answered with this node's ID", async () => {
      const f = gateway();
      await expect(f.gate.listRunningAgents({ fromNodeId: PEER.nodeId, toNodeId: SELF }, PEER_CALLER)).resolves.toEqual({ status: 200,
        answer: { accepted: true, nodeId: SELF, agents: [{ kind: "agent", name: "PM", agent_run_id: "pm_b", state: "idle" }] } });
    });
  });
});
