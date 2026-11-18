import { describe, expect, it, vi } from "vitest";
import type { CollaborationCommunicationMessage } from "../../../src/agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { PreparedRemoteSend } from "../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import {
  createAgentRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { delegatedRunEndpoint, delegatedTeamEndpoints, delegatorEndpoint, unlinkedRunEndpoint } from "../../../src/agent-collaboration/execution/remote/remote-endpoint.js";
import { RemoteMessageSend } from "../../../src/agent-collaboration/execution/remote/remote-message-send.js";
import { RemoteRunLinks } from "../../../src/agent-collaboration/execution/remote/remote-run-links.js";
import type { RemoteRunChannel } from "../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import type { PeerAgentRunLink, PeerTeamRunLink } from "../../../src/agent-collaboration/execution/remote/peer-run-link.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";

/**
 * Design § Remote Messaging: Owners And Order (AR-005 … AR-008) and § Task Closure Of A Remote Run (AR-007):
 * the two endpoint kinds and their rules, and the one shared owner of the outbound sequence. (A peer run's Task closure
 * fence is the Task side's: `task-execution-resource-release.ts`.)
 */

const DELEGATOR = "agent_delegator";
const REMOTE = "publisher_7f3";
const HOST = "publisher_host";
const PEER_NODE = "srv_peer_b";
const link: PeerAgentRunLink = Object.freeze({ kind: "agent", address: "/publisher", agentRunId: REMOTE, nodeId: PEER_NODE, delegatorAgentRunId: DELEGATOR, startedAt: "2026-10-20T10:00:00.000Z", open: true });
const teamLink: PeerTeamRunLink = Object.freeze({ kind: "agent_team", address: "/studio", teamRunId: "team_b", nodeId: PEER_NODE,
  coordinatorAddress: "/studio/lead" as never, members: [{ address: "/studio/lead" as never, agentRunId: "lead_b" }, { address: "/studio/writer" as never, agentRunId: "writer_b" }],
  delegatorAgentRunId: DELEGATOR, startedAt: "2026-10-20T10:00:00.000Z", open: true });
const delegatedFrom = Object.freeze({ nodeId: "srv_node_a", delegatingRun: Object.freeze({ kind: "agent_team" as const, runId: "team_a" }), delegatorAgentRunId: DELEGATOR });
const message = (sender: string, receiver: string): CollaborationCommunicationMessage => Object.freeze({
  messageId: "collabmsg_1", senderAgentRunId: sender, receiverAgentRunId: receiver, content: "hello", messageType: "agent_message",
  referenceFiles: Object.freeze([]), createdAt: "2026-10-20T10:01:00.000Z",
});

describe("remote endpoint kinds (AR-006)", () => {
  it("a delegated run (on the delegating node): only its delegator, the link's Task, a plain message request", () => {
    const endpoint = delegatedRunEndpoint(link);
    expect(endpoint).toMatchObject({ kind: "delegated_run", reference: { nodeId: PEER_NODE, agentRunId: REMOTE }, displayName: "publisher" });
    expect([...endpoint.pairedAgentRunIds]).toEqual([DELEGATOR]);
    expect([endpoint.allowsSender(DELEGATOR), endpoint.allowsSender("other"), endpoint.allowsTarget(DELEGATOR), endpoint.allowsTarget("other")]).toEqual([true, false, true, false]);
    expect(endpoint.transmission(message(DELEGATOR, REMOTE))).toEqual({ nodeId: PEER_NODE, kind: "message", messageId: "collabmsg_1",
      senderAgentRunId: DELEGATOR, targetRoot: { kind: "agent", runId: REMOTE }, targetAgentRunId: REMOTE, content: "hello", messageType: "agent_message",
      createdAt: "2026-10-20T10:01:00.000Z" });
  });

  it("autobyteus-247 G-1: a delegated Team is one endpoint per member; only its delegator, the Team's Task, the Team as the root there", () => {
    const endpoints = delegatedTeamEndpoints(teamLink);
    expect(endpoints.map((endpoint) => [endpoint.kind, endpoint.reference.agentRunId, endpoint.displayName])).toEqual([
      ["delegated_team", "lead_b", "lead"], ["delegated_team", "writer_b", "writer"]]);
    for (const endpoint of endpoints) {
      expect([...endpoint.pairedAgentRunIds]).toEqual([DELEGATOR]);
      expect([endpoint.allowsSender(DELEGATOR), endpoint.allowsSender("other"), endpoint.allowsTarget(DELEGATOR), endpoint.allowsTarget("other")]).toEqual([true, false, true, false]);
    }
    expect(endpoints[1]!.transmission(message(DELEGATOR, "writer_b"))).toMatchObject({ nodeId: PEER_NODE,
      targetRoot: { kind: "agent_team", runId: "team_b" }, targetAgentRunId: "writer_b" });
  });

  it("a delegator (on the node that runs the delegated run): only the host, no Task here, the coordinating run echoed, the work packet", () => {
    const endpoint = delegatorEndpoint([HOST], delegatedFrom);
    expect(endpoint).toMatchObject({ kind: "delegator", reference: { nodeId: "srv_node_a", agentRunId: DELEGATOR } });
    expect([...endpoint.pairedAgentRunIds]).toEqual([HOST]);
    expect([endpoint.allowsSender(HOST), endpoint.allowsSender("child"), endpoint.allowsTarget(HOST), endpoint.allowsTarget("child")]).toEqual([true, false, true, false]);
    expect(endpoint.transmission(message(HOST, DELEGATOR))).toMatchObject({ nodeId: "srv_node_a", targetRoot: { kind: "agent_team", runId: "team_a" } });
    expect(endpoint.admitsWorkPacket("srv_node_a", DELEGATOR, HOST)).toBe(true);
    expect(endpoint.admitsWorkPacket("srv_other", DELEGATOR, HOST)).toBe(false);
    expect(endpoint.admitsWorkPacket("srv_node_a", "someone", HOST)).toBe(false);
    expect(endpoint.admitsWorkPacket("srv_node_a", DELEGATOR, "child")).toBe(false);
  });

  it("G-8: a Team root's delegator pairs with every member; the work packet is for a member, from the delegator on its node", () => {
    const endpoint = delegatorEndpoint(["lead_b", "writer_b"], delegatedFrom);
    expect([endpoint.allowsSender("lead_b"), endpoint.allowsSender("writer_b"), endpoint.allowsTarget("writer_b"), endpoint.allowsTarget("copy_b")]).toEqual([true, true, true, false]);
    expect(endpoint.admitsWorkPacket("srv_node_a", DELEGATOR, "lead_b")).toBe(true);
    expect(endpoint.admitsWorkPacket("srv_node_a", DELEGATOR, "copy_b")).toBe(false);
  });

  it("autobyteus-492: an unlinked run is named by node and run ID only, pairs with the one local agent of its message, and asks for a run_message (no root)", () => {
    const endpoint = unlinkedRunEndpoint({ nodeId: PEER_NODE, agentRunId: "pm_b", pairedAgentRunId: DELEGATOR });
    expect(endpoint).toMatchObject({ kind: "unlinked_run", reference: { nodeId: PEER_NODE, agentRunId: "pm_b" }, displayName: "pm_b" });
    expect([endpoint.allowsSender(DELEGATOR), endpoint.allowsSender("other"), endpoint.allowsTarget(DELEGATOR)]).toEqual([true, false, true]);
    expect(endpoint.transmission(message(DELEGATOR, "pm_b"))).toEqual({ nodeId: PEER_NODE, kind: "run_message", messageId: "collabmsg_1",
      senderAgentRunId: DELEGATOR, targetAgentRunId: "pm_b", content: "hello", messageType: "agent_message", createdAt: "2026-10-20T10:01:00.000Z" });
  });

  it("RemoteRunLinks holds membership only: both kinds by run ID, and the inbound link check by node, sender and target", () => {
    const links = new RemoteRunLinks({ peerRuns: () => [link, teamLink], backLink: { pairedAgentRunIds: () => [HOST], delegatedFrom } });
    expect(links.endpointFor(REMOTE)?.kind).toBe("delegated_run");
    expect(links.endpointFor(DELEGATOR)?.kind).toBe("delegator");
    expect(links.has(HOST)).toBe(false);
    expect(links.inboundEndpoint(PEER_NODE, REMOTE, DELEGATOR)?.kind).toBe("delegated_run");
    expect(links.inboundEndpoint("srv_elsewhere", REMOTE, DELEGATOR)).toBeNull();
    expect(links.inboundEndpoint(PEER_NODE, REMOTE, "another_local")).toBeNull();
    // Team links (G-3, G-4, G-6): every member is an endpoint; the link is found by its team run ID.
    expect(links.endpointFor("writer_b")?.kind).toBe("delegated_team");
    expect(links.inboundEndpoint(PEER_NODE, "writer_b", DELEGATOR)?.kind).toBe("delegated_team");
    expect(links.has("team_b")).toBe(false);
    expect(links.teamLinkFor("team_b")).toBe(teamLink);
    expect(links.teamLinkFor(REMOTE)).toBeNull();
    // The one link check for both inbound kinds (the stored check before a restore, N-303, uses it).
    expect(links.admitsInbound({ kind: "message", fromNodeId: PEER_NODE, senderAgentRunId: "lead_b", targetAgentRunId: DELEGATOR })).toBe(true);
    expect(links.admitsInbound({ kind: "message", fromNodeId: PEER_NODE, senderAgentRunId: "lead_b", targetAgentRunId: HOST })).toBe(false);
    expect(links.admitsInbound({ kind: "work_packet", fromNodeId: "srv_node_a", senderAgentRunId: DELEGATOR, targetAgentRunId: HOST })).toBe(true);
    expect(links.admitsInbound({ kind: "work_packet", fromNodeId: PEER_NODE, senderAgentRunId: "lead_b", targetAgentRunId: DELEGATOR })).toBe(false);
  });
});

describe("RemoteMessageSend: the one owner of the outbound sequence (AR-005, AR-008)", () => {
  const sender = createCollaborationMemberExecutionIdentity({ root: createAgentRootExecutionIdentity(DELEGATOR), memberAddress: "/lead" as never, agentRunId: DELEGATOR });
  const endpoint = delegatedRunEndpoint(link);
  const harness = (options: { prepared?: PreparedRemoteSend; receipt?: { accepted: true } | { accepted: false; code: string; message: string } } = {}) => {
    const calls: string[] = [];
    const prepared: PreparedRemoteSend = options.prepared ?? { ok: true, message: message(DELEGATOR, REMOTE), endpoint };
    const engine = {
      prepareRemoteSend: vi.fn(() => { calls.push("prepare"); return prepared; }),
      commitSentToRemote: vi.fn(async () => { calls.push("commit"); return { accepted: true as const, agentRunId: REMOTE, displayName: "publisher" }; }),
    };
    const channel: RemoteRunChannel = {
      findPeer: vi.fn(), startDelegatedRun: vi.fn(),
      peerName: vi.fn(async () => "docker"),
      deliverMessage: vi.fn(async () => { calls.push("deliver"); return options.receipt ?? { accepted: true as const }; }),
    };
    const send = new RemoteMessageSend({ engine: () => engine as never, links: new RemoteRunLinks({ peerRuns: () => [link], channel: () => channel }) });
    return { send, engine, channel, calls };
  };

  it("prepares, delivers, then commits; the result names the node", async () => {
    const h = harness();
    await expect(h.send.send({ sender, endpoint, content: "hello" })).resolves.toEqual({
      accepted: true, agentRunId: REMOTE, displayName: "publisher", message: `Delivered message to ${REMOTE} on node "docker".` });
    expect(h.calls).toEqual(["prepare", "deliver", "commit"]);
    expect(h.channel.deliverMessage).toHaveBeenCalledWith(expect.objectContaining({ nodeId: PEER_NODE, kind: "message", messageId: "collabmsg_1" }));
  });

  it("autobyteus-492 DS-006: a sender the link does not pair (a teammate of the delegator) is sent as an unlinked run_message to the same run on the same node", async () => {
    const h = harness();
    const other = { ...sender, agentRunId: "not_the_delegator" };
    await expect(h.send.send({ sender: other, endpoint, content: "hello" })).resolves.toMatchObject({ accepted: true });
    expect(h.engine.prepareRemoteSend).toHaveBeenCalledWith(expect.objectContaining({ endpoint: expect.objectContaining({ kind: "unlinked_run",
      reference: { nodeId: PEER_NODE, agentRunId: REMOTE } }) }));
    expect(h.calls).toEqual(["prepare", "deliver", "commit"]);
  });

  it("autobyteus-492 DS-004: sendToPeerRun uses the root's link when the sender is paired on that node, else an unlinked endpoint", async () => {
    const linked = harness();
    await linked.send.sendToPeerRun({ sender, nodeId: PEER_NODE, targetAgentRunId: REMOTE, content: "hello" });
    expect(linked.engine.prepareRemoteSend).toHaveBeenCalledWith(expect.objectContaining({ endpoint: expect.objectContaining({ kind: "delegated_run" }) }));
    const otherNode = harness();
    await otherNode.send.sendToPeerRun({ sender, nodeId: "srv_other", targetAgentRunId: REMOTE, content: "hello" });
    expect(otherNode.engine.prepareRemoteSend).toHaveBeenCalledWith(expect.objectContaining({ endpoint: expect.objectContaining({ kind: "unlinked_run",
      reference: { nodeId: "srv_other", agentRunId: REMOTE } }) }));
    const unknown = harness();
    await unknown.send.sendToPeerRun({ sender, nodeId: PEER_NODE, targetAgentRunId: "pm_b", content: "hello" });
    expect(unknown.engine.prepareRemoteSend).toHaveBeenCalledWith(expect.objectContaining({ endpoint: expect.objectContaining({ kind: "unlinked_run" }) }));
  });

  it("returns the engine's refusal and sends nothing", async () => {
    const refusal = { accepted: false as const, code: "REMOTE_ATTACHMENTS_NOT_SUPPORTED", message: "no files" };
    const h = harness({ prepared: { ok: false, refusal } });
    await expect(h.send.send({ sender, endpoint, content: "hello", referenceFiles: ["/a.md"] })).resolves.toEqual(refusal);
    expect(h.calls).toEqual(["prepare"]);
  });

  it("returns the peer's refusal and writes nothing", async () => {
    const h = harness({ receipt: { accepted: false, code: "PEER_UNREACHABLE", message: "Node \"docker\" could not be reached." } });
    await expect(h.send.send({ sender, endpoint, content: "hello" })).resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE" });
    expect(h.calls).toEqual(["prepare", "deliver"]);
  });
});
