import { describe, expect, it, vi } from "vitest";
import { RemoteMessageReceiver, type RemoteRootDirectory } from "../../../src/remote-collaboration/inbound/remote-message-receiver.js";
import type { DeliverRemoteMessageRequest } from "../../../src/remote-collaboration/domain/remote-requests.js";
import type { StoredRemoteLinkCheck } from "../../../src/agent-collaboration/execution/remote/remote-run-links.js";

/**
 * autobyteus-247 G-2 / N-303 / N-304: an inbound request names its root (`targetRoot`), resolved by kind with one
 * rule for both directions; before an inactive root is restored, the root managers check it against its stored
 * links (this module reads no root files).
 */

const PEER = { nodeId: "srv_node_a", name: "desktop", baseUrl: "http://a", addedAt: "2026-10-21T00:00:00.000Z" };
const request = (overrides: Partial<DeliverRemoteMessageRequest> = {}): DeliverRemoteMessageRequest => ({
  fromNodeId: PEER.nodeId, toNodeId: "srv_node_b", kind: "message", messageId: "collabmsg_1",
  sender: { agentRunId: "assistant_a1" }, targetRoot: { kind: "agent_team", runId: "team_b" }, target: { agentRunId: "writer_b" },
  content: "hello", messageType: "agent_message", createdAt: "2026-10-21T10:00:00.000Z", ...overrides,
} as DeliverRemoteMessageRequest);

const setup = (stored: StoredRemoteLinkCheck = "proceed") => {
  const root = () => ({ acceptRemoteMessage: vi.fn(async () => ({ accepted: true })), acceptRemoteWorkPacket: vi.fn(async () => ({ accepted: true })) });
  const roots = { standalone: root(), team: root(), org: root() };
  const directory = {
    storedLinkCheck: vi.fn(async () => stored),
    standalone: vi.fn(async () => roots.standalone),
    team: vi.fn(async () => roots.team),
    org: vi.fn(async () => roots.org),
  } satisfies RemoteRootDirectory;
  return { receiver: new RemoteMessageReceiver(directory), directory, roots };
};

describe("RemoteMessageReceiver resolves targetRoot by kind (G-2)", () => {
  it("a message for a Team member goes to that Team root, with the message as sent", async () => {
    const f = setup();
    await expect(f.receiver.accept(request(), PEER)).resolves.toEqual({ accepted: true });
    expect(f.directory.team).toHaveBeenCalledExactlyOnceWith("team_b");
    expect(f.roots.team.acceptRemoteMessage).toHaveBeenCalledExactlyOnceWith({ fromNodeId: PEER.nodeId, fromNodeName: "desktop", message: {
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
    await expect(f.receiver.accept(request({ ...packet, target: { agentRunId: "lead_b" } }), PEER)).resolves.toEqual({ accepted: true });
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
    f.directory.team.mockRejectedValueOnce(new Error("TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED"));
    await expect(f.receiver.accept(request(), PEER)).resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_FOUND" });
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
