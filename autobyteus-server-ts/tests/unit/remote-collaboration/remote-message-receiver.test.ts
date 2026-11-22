import { describe, expect, it, vi } from "vitest";
import { PeerStartedRunDecisions } from "../../../src/remote-collaboration/inbound/peer-started-run-decisions.js";
import { RemoteMessageReceiver, type RemoteRootDirectory } from "../../../src/remote-collaboration/inbound/remote-message-receiver.js";
import type { DeliverRemoteMessageRequest } from "../../../src/remote-collaboration/domain/remote-requests.js";
import type { StoredRemoteLinkCheck } from "../../../src/agent-collaboration/execution/remote/remote-run-links.js";

/**
 * autobyteus-247 G-2 / N-303 / N-304: an inbound request names its root (`targetRoot`), resolved by kind with one
 * rule for both directions; before an inactive root is restored, the root managers check it against its stored
 * links (this module reads no root files).
 */

const PEER = { nodeId: "srv_node_a", name: "desktop", baseUrl: "http://a", addedAt: "2026-10-21T00:00:00.000Z", paired: true };
const request = (overrides: Partial<DeliverRemoteMessageRequest> = {}): DeliverRemoteMessageRequest => ({
  fromNodeId: PEER.nodeId, toNodeId: "srv_node_b", kind: "message", messageId: "collabmsg_1",
  sender: { agentRunId: "assistant_a1", address: "/assistant" }, targetRoot: { kind: "agent_team", runId: "team_b" }, target: { agentRunId: "writer_b" },
  content: "hello", messageType: "agent_message", createdAt: "2026-10-21T10:00:00.000Z", ...overrides,
} as DeliverRemoteMessageRequest);

const setup = (stored: StoredRemoteLinkCheck = "proceed") => {
  const root = () => ({ acceptRemoteMessage: vi.fn(async () => ({ accepted: true, agentAddress: "/writer" })), acceptRemoteWorkPacket: vi.fn(async () => ({ accepted: true })) });
  const roots = { standalone: root(), team: root(), org: root() };
  const directory = {
    storedLinkCheck: vi.fn(async () => stored),
    standalone: vi.fn(async () => roots.standalone),
    team: vi.fn(async () => roots.team),
    org: vi.fn(async () => roots.org),
    runAgents: vi.fn() as never,
    liveRoot: vi.fn(() => liveRoot),
  } satisfies RemoteRootDirectory;
  const liveRoot = { acceptPeerRunMessage: vi.fn(async () => ({ accepted: true as const, agentAddress: "/project_task_manager" })) };
  const titles = { recordFirstMessage: vi.fn(async () => undefined) }
  // autobyteus-492: "pm_b" runs in the standalone root "pm_b"; the team "team_b" runs here with its coordinator "lead_b".
  const running = {
    rootOf: vi.fn((agentRunId: string) => agentRunId === "pm_b"
      ? { root: { rootSubjectKind: "agent" as const, rootRunId: "pm_b" }, status: { agentRunId, status: "idle" as const, backgroundTasksRunning: 0 } } : null),
    teamCoordinatorOf: vi.fn((teamRunId: string) => teamRunId === "team_b" ? "lead_b" : null),
  };
  // autobyteus-591 S-5: the record of runs their delegating node closed, cleared by that node's accepted message or work.
  const closed = { openedBy: vi.fn(async () => undefined) };
  return { receiver: new RemoteMessageReceiver(directory, titles, new PeerStartedRunDecisions(), running, closed), directory, roots, titles, running, liveRoot, closed };
};

describe("RemoteMessageReceiver resolves targetRoot by kind (G-2)", () => {
  it("a message for a Team member goes to that Team root, with the message as sent", async () => {
    const f = setup();
    // autobyteus-565: the answer names the receiving agent's address; the root gets the sender's.
    await expect(f.receiver.accept(request(), PEER)).resolves.toEqual({ accepted: true, receiverAddress: "/writer" });
    expect(f.directory.team).toHaveBeenCalledExactlyOnceWith("team_b");
    expect(f.roots.team.acceptRemoteMessage).toHaveBeenCalledExactlyOnceWith({ fromNodeId: PEER.nodeId, fromNodeName: "desktop", senderAddress: "/assistant", message: {
      messageId: "collabmsg_1", senderAgentRunId: "assistant_a1", receiverAgentRunId: "writer_b", content: "hello",
      messageType: "agent_message", referenceFiles: [], createdAt: "2026-10-21T10:00:00.000Z" } });
  });

  it("each root kind, both directions: a run on this node for a peer (agent, agent_team) or a coordinating run (any kind)", async () => {
    const f = setup();
    await f.receiver.accept(request({ targetRoot: { kind: "agent", runId: "host_b" }, target: { agentRunId: "host_b" } }), PEER);
    await f.receiver.accept(request({ targetRoot: { kind: "agent_org", runId: "org_b" }, target: { agentRunId: "lead_b" } }), PEER);
    expect(f.directory.standalone).toHaveBeenCalledExactlyOnceWith("host_b");
    expect(f.directory.org).toHaveBeenCalledExactlyOnceWith("org_b");
    expect(f.roots.standalone.acceptRemoteMessage).toHaveBeenCalledOnce();
    expect(f.roots.org.acceptRemoteMessage).toHaveBeenCalledOnce();
  });

  it("a work packet starts the Agent run or the Team's coordinator; an Org is never started for a peer", async () => {
    const f = setup();
    const packet = { kind: "work_packet" as const, messageId: undefined, content: "Draft the episode." };
    await expect(f.receiver.accept(request({ ...packet, target: { agentRunId: "lead_b" } }), PEER)).resolves.toEqual({ accepted: true, receiverAddress: null });
    expect(f.roots.team.acceptRemoteWorkPacket).toHaveBeenCalledExactlyOnceWith({ fromNodeId: PEER.nodeId, fromNodeName: "desktop",
      senderAgentRunId: "assistant_a1", targetAgentRunId: "lead_b", description: "Draft the episode." });
    await f.receiver.accept(request({ ...packet, targetRoot: { kind: "agent", runId: "host_b" }, target: { agentRunId: "host_b" } }), PEER);
    expect(f.roots.standalone.acceptRemoteWorkPacket).toHaveBeenCalledOnce();
    await expect(f.receiver.accept(request({ ...packet, targetRoot: { kind: "agent_org", runId: "org_b" } }), PEER))
      .resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_FOUND" });
    expect(f.roots.org.acceptRemoteWorkPacket).not.toHaveBeenCalled();
  });

  it("a root that is gone, or that cannot be restored, is not found", async () => {
    const f = setup();
    f.directory.team.mockResolvedValueOnce(null as never);
    await expect(f.receiver.accept(request(), PEER)).resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_FOUND" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    f.directory.team.mockRejectedValueOnce(new Error("TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED"));
    await expect(f.receiver.accept(request(), PEER)).resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_FOUND" });
    // Why it could not be restored is logged on this node (CRR-004 F-4); the sender still reads "not found".
    expect(warn).toHaveBeenCalledWith("REMOTE_TARGET_ROOT_UNAVAILABLE", { error: "TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED" });
    warn.mockRestore();
  });
});

describe("autobyteus-591 S-5: the delegating node's accepted message or work clears B's closed record", () => {
  it("an accepted message or work packet clears it for the sending node; a refused one, or an Org, does not", async () => {
    const f = setup();
    await f.receiver.accept(request(), PEER);
    expect(f.closed.openedBy).toHaveBeenCalledExactlyOnceWith({ kind: "agent_team", runId: "team_b" }, PEER.nodeId);
    await f.receiver.accept(request({ kind: "work_packet", messageId: undefined, content: "x", targetRoot: { kind: "agent", runId: "host_b" }, target: { agentRunId: "host_b" } } as never), PEER);
    expect(f.closed.openedBy).toHaveBeenLastCalledWith({ kind: "agent", runId: "host_b" }, PEER.nodeId);
    f.closed.openedBy.mockClear();
    f.roots.team.acceptRemoteMessage.mockResolvedValueOnce({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED", message: "x" } as never);
    await f.receiver.accept(request(), PEER);
    await setup("not_linked").receiver.accept(request(), PEER);
    await f.receiver.accept(request({ targetRoot: { kind: "agent_org", runId: "org_b" } }), PEER);
    expect(f.closed.openedBy).not.toHaveBeenCalled();
  });

  it("a failure to write the record still answers accepted, and is logged", async () => {
    const f = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    f.closed.openedBy.mockRejectedValueOnce(new Error("disk full"));
    await expect(f.receiver.accept(request(), PEER)).resolves.toMatchObject({ accepted: true });
    expect(warn).toHaveBeenCalledWith("CLOSED_DELEGATIONS_WRITE_FAILED", expect.anything());
  });
});

describe("the stored-link check before a restore (N-303, N-304)", () => {
  it("asks the directory first, with who sends it from which node to which agent", async () => {
    const f = setup();
    await f.receiver.accept(request(), PEER);
    expect(f.directory.storedLinkCheck).toHaveBeenCalledExactlyOnceWith({ kind: "agent_team", runId: "team_b" },
      { kind: "message", fromNodeId: PEER.nodeId, senderAgentRunId: "assistant_a1", targetAgentRunId: "writer_b" });
    expect(f.directory.storedLinkCheck.mock.invocationCallOrder[0]).toBeLessThan(f.directory.team.mock.invocationCallOrder[0]!);
  });

  it("an unlinked sender is refused without restoring anything; a root with no stored package is not found", async () => {
    const unlinked = setup("not_linked");
    await expect(unlinked.receiver.accept(request(), PEER)).resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    const missing = setup("not_found");
    await expect(missing.receiver.accept(request(), PEER)).resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_FOUND" });
    for (const f of [unlinked, missing]) {
      expect(f.directory.team).not.toHaveBeenCalled();
      expect(f.roots.team.acceptRemoteMessage).not.toHaveBeenCalled();
    }
  });
});

describe("an accepted work packet's content is the run's title (autobyteus-269)", () => {
  const packet = { kind: "work_packet" as const, messageId: undefined, content: "Draft the episode." };

  it("records the packet's description for its root, Agent or Team, once the root accepted it", async () => {
    const f = setup();
    await f.receiver.accept(request({ ...packet, target: { agentRunId: "lead_b" } }), PEER);
    await f.receiver.accept(request({ ...packet, targetRoot: { kind: "agent", runId: "host_b" }, target: { agentRunId: "host_b" } }), PEER);
    expect(f.titles.recordFirstMessage.mock.calls).toEqual([
      [{ kind: "agent_team", runId: "team_b" }, "Draft the episode."],
      [{ kind: "agent", runId: "host_b" }, "Draft the episode."],
    ]);
  });

  it("records nothing for a refused packet, for a refused link, or for a message", async () => {
    const f = setup();
    f.roots.team.acceptRemoteWorkPacket.mockResolvedValueOnce({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED", message: "x" } as never);
    await f.receiver.accept(request({ ...packet, target: { agentRunId: "lead_b" } }), PEER);
    await setup("not_linked").receiver.accept(request(packet), PEER);
    await f.receiver.accept(request(), PEER);
    expect(f.titles.recordFirstMessage).not.toHaveBeenCalled();
  });

  it("a failure to record the title still answers accepted, and is logged", async () => {
    const f = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    f.titles.recordFirstMessage.mockRejectedValueOnce(new Error("catalog unavailable"));
    await expect(f.receiver.accept(request({ ...packet, target: { agentRunId: "lead_b" } }), PEER)).resolves.toEqual({ accepted: true, receiverAddress: null });
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to record the title of run 'team_b'")));
    warn.mockRestore();
  });
});

describe("autobyteus-492 DS-004: a message by run ID only (acceptRunMessage)", () => {
  const runMessage = (target: string) => ({ fromNodeId: PEER.nodeId, toNodeId: "srv_node_b", messageId: "collabmsg_9", sender: { agentRunId: "pm_a", address: "/project_task_manager" },
    target: { agentRunId: target }, content: "hello B", messageType: "agent_message", createdAt: "2026-11-18T10:00:00.000Z" });

  it("a running agent: its active root (never restored) accepts it with the sender's node; no stored-link check, no restore", async () => {
    const f = setup();
    await expect(f.receiver.acceptRunMessage(runMessage("pm_b"), PEER)).resolves.toEqual({ accepted: true, receiverAddress: "/project_task_manager" });
    expect(f.directory.liveRoot).toHaveBeenCalledExactlyOnceWith({ rootSubjectKind: "agent", rootRunId: "pm_b" });
    expect(f.liveRoot.acceptPeerRunMessage).toHaveBeenCalledExactlyOnceWith({ fromNodeId: PEER.nodeId, fromNodeName: "desktop", senderAddress: "/project_task_manager", message: {
      messageId: "collabmsg_9", senderAgentRunId: "pm_a", receiverAgentRunId: "pm_b", content: "hello B", messageType: "agent_message",
      referenceFiles: [], createdAt: "2026-11-18T10:00:00.000Z" } });
    expect(f.directory.storedLinkCheck).not.toHaveBeenCalled();
    expect(f.directory.standalone).not.toHaveBeenCalled();
  });

  it("entry-form row 8: a run ID no running agent here has is refused not running; nothing is resolved or restored", async () => {
    const f = setup();
    await expect(f.receiver.acceptRunMessage(runMessage("stopped_b"), PEER)).resolves.toEqual({ accepted: false, code: "REMOTE_TARGET_NOT_RUNNING",
      message: "No running agent has the run id 'stopped_b'." });
    expect(f.directory.liveRoot).not.toHaveBeenCalled();
    expect(f.directory.standalone).not.toHaveBeenCalled();
  });

  it("entry-form row 11 (BEH-006, AR-006): a team run's ID that runs here is refused with its coordinator's run ID", async () => {
    const f = setup();
    await expect(f.receiver.acceptRunMessage(runMessage("team_b"), PEER)).resolves.toEqual({ accepted: false, code: "TARGET_IS_TEAM_RUN",
      message: "team_b is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: lead_b." });
  });
});
