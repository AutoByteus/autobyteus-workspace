import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { peerMemberProjection, remoteOwnerCommandOf } from "../../../src/agent-collaboration/execution/remote/remote-child-commands.js";
import { PeerAgentRun } from "../../../src/agent-collaboration/execution/remote/peer-agent-run.js";
import { PeerTeamRun } from "../../../src/agent-collaboration/execution/remote/peer-team-run.js";
import { createPeerRunOf, executePeerCommand } from "../../../src/agent-collaboration/execution/remote/peer-runs.js";
import type { RemoteRunChannel } from "../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import type { PeerAgentRunLink, PeerTeamRunLink } from "../../../src/agent-collaboration/execution/remote/peer-run-link.js";
import { createAgentRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-461 SR-066 (REQ-013): a run on a peer node, reached by its own identity through its handle, never through
 * its delegator; base's commands and reads (autobyteus-278 DS-003 / DS-004, N-403), given the tree's link.
 */
const DOCKER = "srv_docker_000000000000000000000000000";
const agentLink: PeerAgentRunLink = { kind: "agent", address: "/researcher" as never, agentRunId: "researcher-run", nodeId: DOCKER,
  delegatorAgentRunId: "manager-run", startedAt: "2026-10-23T08:00:00.000Z", open: true };
const teamLink: PeerTeamRunLink = { kind: "agent_team", address: "/marketing" as never, teamRunId: "marketing-run", nodeId: DOCKER,
  coordinatorAddress: "/marketing/lead" as never,
  members: [{ address: "/marketing/lead" as never, agentRunId: "lead-run" }, { address: "/marketing/writer" as never, agentRunId: "writer-run" }],
  delegatorAgentRunId: "manager-run", startedAt: "2026-10-23T08:01:00.000Z", open: true };

const fakeChannel = (accepted = true) => ({
  ownerCommand: vi.fn(async () => accepted ? { accepted: true as const } : { accepted: false as const, code: "PEER_UNREACHABLE", message: "docker isn't reachable." }),
  agentProjection: vi.fn(async () => accepted
    ? { accepted: true as const, projection: { agentRunId: "lead-run", conversation: [{ kind: "message" }], activities: [], summary: "Plan", lastActivityAt: null, hasEarlierActiveTraceEvents: true } }
    : { accepted: false as const, code: "PEER_UNREACHABLE", message: "Couldn't reach docker." }),
  runSummaries: vi.fn(async () => accepted
    ? { accepted: true as const, runs: [{ kind: "agent_team" as const, runId: "marketing-run", title: "Launch", statuses: [{ agentRunId: "lead-run", status: "running" as const }], launches: [] }] }
    : { accepted: false as const, code: "PEER_UNREACHABLE", message: "Couldn't reach docker." }),
  observeRun: vi.fn(() => ({ close: vi.fn() })),
});
const channelOf = (current: ReturnType<typeof fakeChannel> | null) => () => current as unknown as RemoteRunChannel | null;
const userMessage = (metadata: Record<string, unknown>) => AgentInputUserMessage.fromDict({ content: "status?", context_files: null, metadata });

describe("PeerAgentRun / PeerTeamRun", () => {
  it("a message keeps its text and window identity; an interrupt stays one; a tool approval has no remote form", () => {
    expect(remoteOwnerCommandOf({ kind: "post_message", message: userMessage({ message_id: "m1", dedupe_key: "d1" }) }))
      .toEqual({ kind: "post_message", content: "status?", messageId: "m1", dedupeKey: "d1" });
    expect(remoteOwnerCommandOf({ kind: "interrupt" })).toEqual({ kind: "interrupt" });
    expect(remoteOwnerCommandOf({ kind: "approve_tool", invocationId: "i1", approved: true, reason: null })).toBeNull();
  });

  it("a command goes to the node with the run that names it there; a Team member's goes to the Team run", async () => {
    const current = fakeChannel();
    const team = new PeerTeamRun(teamLink, channelOf(current));
    await expect(executePeerCommand(team, "writer-run", { kind: "interrupt" })).resolves.toEqual({ accepted: true });
    expect(current.ownerCommand).toHaveBeenCalledWith(DOCKER, { kind: "agent_team", runId: "marketing-run" }, "writer-run", { kind: "interrupt" });
    await executePeerCommand(new PeerAgentRun(agentLink, channelOf(current)), "researcher-run", { kind: "post_message", message: userMessage({ message_id: "m2", dedupe_key: "d2" }) });
    expect(current.ownerCommand).toHaveBeenLastCalledWith(DOCKER, { kind: "agent", runId: "researcher-run" }, "researcher-run",
      expect.objectContaining({ kind: "post_message", content: "status?", messageId: "m2", dedupeKey: "d2" }));
    await expect(executePeerCommand(team, "writer-run", { kind: "approve_tool", invocationId: "i1", approved: true, reason: null }))
      .resolves.toMatchObject({ accepted: false, code: "REMOTE_RUN_COMMAND_UNSUPPORTED" });
    await expect(executePeerCommand(team, "manager-run", { kind: "interrupt" })).resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
  });

  it("N-13: a first-input-only post (restart resume) is refused; nothing reaches the node", async () => {
    const current = fakeChannel();
    await expect(executePeerCommand(new PeerAgentRun(agentLink, channelOf(current)), "researcher-run", {
      kind: "post_message", message: userMessage({ message_id: "m3" }), postOptions: { onlyAsFirstInput: true },
    })).resolves.toMatchObject({ accepted: false, code: "REMOTE_RUN_FIRST_INPUT_UNSUPPORTED" });
    expect(current.ownerCommand).not.toHaveBeenCalled();
  });

  it("Stop terminates the run on its node, a Team through its coordinator; an offline node and remote collaboration off are refused", async () => {
    const current = fakeChannel();
    await expect(new PeerTeamRun(teamLink, channelOf(current)).terminate()).resolves.toEqual({ accepted: true });
    expect(current.ownerCommand).toHaveBeenCalledWith(DOCKER, { kind: "agent_team", runId: "marketing-run" }, "lead-run", { kind: "terminate" });
    await expect(new PeerAgentRun(agentLink, channelOf(fakeChannel(false))).terminate())
      .resolves.toMatchObject({ accepted: false, code: "PEER_UNREACHABLE", message: "docker isn't reachable." });
    await expect(new PeerAgentRun(agentLink, channelOf(null)).terminate()).resolves.toMatchObject({ accepted: false, code: "REMOTE_COLLABORATION_OFF" });
  });

  it("N-403: a member's stored conversation is read from its node, at its address under its delegator; another address is refused", async () => {
    const current = fakeChannel();
    const team = new PeerTeamRun(teamLink, channelOf(current));
    await expect(peerMemberProjection(team, "lead-run", "/marketing/lead")).resolves.toMatchObject({
      agentRunId: "lead-run", memberAddress: "/marketing/lead", summary: "Plan", hasEarlierActiveTraceEvents: false });
    expect(current.agentProjection).toHaveBeenCalledWith(DOCKER, { kind: "agent_team", runId: "marketing-run" }, "lead-run");
    await expect(peerMemberProjection(team, "lead-run", "/elsewhere")).rejects.toThrow("not an agent of the run on another node");
    await expect(peerMemberProjection(new PeerTeamRun(teamLink, channelOf(fakeChannel(false))), "lead-run", null)).rejects.toThrow("Couldn't reach docker.");
  });

  it("SR-067 G-1: status() asks its node; an unanswered node is not reachable", async () => {
    await expect(new PeerTeamRun(teamLink, channelOf(fakeChannel())).status()).resolves.toMatchObject({
      reachable: true, title: "Launch", statuses: [{ agentRunId: "lead-run", status: "running" }] });
    await expect(new PeerTeamRun(teamLink, channelOf(fakeChannel(false))).status()).resolves.toMatchObject({ reachable: false, statuses: [] });
  });
});

describe("peerRunOf", () => {
  const delegator = createAgentRootExecutionIdentity("manager-run");
  const entry = (run: Record<string, string>, extra: Record<string, unknown> = {}) => ({ run, taskId: "t1", delegatorAgentRunId: "manager-run",
    entryAgentRunId: Object.values(run)[0], started: true, linkedAt: "2026-10-23T08:00:00.000Z", recipientAddress: "/researcher", nodeId: DOCKER, open: true, ...extra });
  const tree = {
    peerRunNamed: (id: string) => id === "researcher-run" ? { agentRunId: "researcher-run" }
      : ["marketing-run", "lead-run"].includes(id) ? { teamRunId: "marketing-run" } : null,
    parentOf: () => ({ delegatingRun: delegator, delegatorAgentRunId: "manager-run" }),
    peerChildrenOf: () => [entry({ agentRunId: "researcher-run" }),
      entry({ teamRunId: "marketing-run" }, { entryAgentRunId: "lead-run", recipientAddress: "/marketing", members: [{ address: "/marketing/lead", agentRunId: "lead-run" }] })],
  };

  it("finds a peer run by its own ID or by a member's, through the tree; never through a root; a local run is null", () => {
    const of = createPeerRunOf(tree as never, () => null);
    expect(of("researcher-run")).toBeInstanceOf(PeerAgentRun);
    expect(of("marketing-run")).toBeInstanceOf(PeerTeamRun);
    expect(of("lead-run")?.runId).toBe("marketing-run");
    expect(of("local-run")).toBeNull();
  });
});
