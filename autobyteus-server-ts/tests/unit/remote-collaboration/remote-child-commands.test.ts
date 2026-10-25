import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RemoteRunLinks } from "../../../src/agent-collaboration/execution/remote/remote-run-links.js";
import {
  executeRemoteChildCommand,
  remoteChildOf,
  remoteMemberProjection,
  remoteOwnerCommandOf,
  stopRemoteChild,
} from "../../../src/agent-collaboration/execution/remote/remote-child-commands.js";
import type { RemoteRunChannel } from "../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import type { RemoteTaskExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";

/** autobyteus-278 DS-003 / DS-004, N-403: a root's commands and stored reads for its remote children. */

const DOCKER = "srv_docker_000000000000000000000000000";
const agentLink: RemoteTaskExecution = { kind: "agent", address: "/researcher" as never, agentRunId: "researcher-run", nodeId: DOCKER,
  delegatorAgentRunId: "manager-run", startedAt: "2026-10-23T08:00:00.000Z" };
const teamLink: RemoteTaskExecution = { kind: "agent_team", address: "/marketing" as never, teamRunId: "marketing-run", nodeId: DOCKER,
  coordinatorAddress: "/marketing/lead" as never, members: [{ address: "/marketing/lead" as never, agentRunId: "lead-run" }],
  delegatorAgentRunId: "manager-run", startedAt: "2026-10-23T08:01:00.000Z" };

const channel = (accepted = true) => ({
  ownerCommand: vi.fn(async () => accepted ? { accepted: true as const } : { accepted: false as const, code: "PEER_UNREACHABLE", message: "docker isn't reachable." }),
  agentProjection: vi.fn(async () => ({ accepted: true as const, projection: { agentRunId: "lead-run", conversation: [{ kind: "message" }], activities: [],
    summary: "Plan", lastActivityAt: null, hasEarlierActiveTraceEvents: true } })),
});
const links = (current: ReturnType<typeof channel>) =>
  new RemoteRunLinks({ remoteRuns: () => [agentLink, teamLink], channel: () => current as unknown as RemoteRunChannel });
const userMessage = (metadata: Record<string, unknown>) => AgentInputUserMessage.fromDict({ content: "status?", context_files: null, metadata });

describe("remote child commands", () => {
  it("a message keeps its text and window identity; an interrupt stays one; a tool approval has no remote form", () => {
    expect(remoteOwnerCommandOf({ kind: "post_message", message: userMessage({ message_id: "m1", dedupe_key: "d1" }) }))
      .toEqual({ kind: "post_message", content: "status?", messageId: "m1", dedupeKey: "d1" });
    expect(remoteOwnerCommandOf({ kind: "interrupt" })).toEqual({ kind: "interrupt" });
    expect(remoteOwnerCommandOf({ kind: "approve_tool", invocationId: "i1", approved: true, reason: null })).toBeNull();
  });

  it("passes a command to the node with the run that names it there; a Team member's goes to the Team run", async () => {
    const current = channel();
    await expect(executeRemoteChildCommand(links(current), "lead-run", { kind: "interrupt" })).resolves.toEqual({ accepted: true });
    expect(current.ownerCommand).toHaveBeenCalledWith(DOCKER, { kind: "agent_team", runId: "marketing-run" }, "lead-run", { kind: "interrupt" });
    await executeRemoteChildCommand(links(current), "researcher-run", { kind: "post_message", message: userMessage({ message_id: "m2", dedupe_key: "d2" }) });
    expect(current.ownerCommand).toHaveBeenLastCalledWith(DOCKER, { kind: "agent", runId: "researcher-run" }, "researcher-run",
      { kind: "post_message", content: "status?", messageId: "m2", dedupeKey: "d2" });
    await expect(executeRemoteChildCommand(links(current), "lead-run", { kind: "approve_tool", invocationId: "i1", approved: true, reason: null }))
      .resolves.toMatchObject({ accepted: false, code: "REMOTE_RUN_COMMAND_UNSUPPORTED" });
    await expect(links(current).ownerCommand("manager-run", { kind: "interrupt" })).resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
  });

  it("Stop of a remote copy terminates its run on its node (a Team through its coordinator); a refusal throws; a local copy is not one", async () => {
    const current = channel();
    await expect(stopRemoteChild(links(current), { teamRunId: "marketing-run" })).resolves.toMatchObject({ outcome: "STOPPED" });
    expect(current.ownerCommand).toHaveBeenCalledWith(DOCKER, { kind: "agent_team", runId: "marketing-run" }, "lead-run", { kind: "terminate" });
    await expect(stopRemoteChild(links(current), { agentRunId: "local-copy" })).resolves.toBeNull();
    await expect(stopRemoteChild(links(channel(false)), { agentRunId: "researcher-run" })).rejects.toThrow("docker isn't reachable.");
  });

  it("N-403: a remote child's stored conversation is read from its node at its address under the root, without earlier pages", async () => {
    const current = channel();
    expect(remoteChildOf([agentLink, teamLink], "local-run", () => current as never)).toBeNull();
    const remote = remoteChildOf([agentLink, teamLink], "lead-run", () => current as never)!;
    expect(remote.memberAddress).toBe("/marketing/lead");
    await expect(remoteMemberProjection(remote, "/marketing/lead")).resolves.toEqual({ agentRunId: "lead-run", memberAddress: "/marketing/lead",
      conversation: [{ kind: "message" }], activities: [], summary: "Plan", lastActivityAt: null, hasEarlierActiveTraceEvents: false });
    expect(current.agentProjection).toHaveBeenCalledWith(DOCKER, { kind: "agent_team", runId: "marketing-run" }, "lead-run");
    await expect(remoteMemberProjection(remote, "/elsewhere")).rejects.toThrow("is not the remote run's agent");
  });
});

describe("RemoteRunLinks.admitsOwner (the running node's link rule for a peer's owner)", () => {
  const back = new RemoteRunLinks({ remoteRuns: () => [], backLink: { pairedAgentRunIds: () => ["lead-run", "writer-run"],
    delegatedFrom: { nodeId: "srv_alpha", coordinatingRun: { kind: "agent", runId: "manager-run" }, delegatorAgentRunId: "manager-run" } } });
  it("admits only the node whose delegation started the run, about its paired agents or the whole run", () => {
    expect(back.admitsInbound({ kind: "owner", fromNodeId: "srv_alpha", targetAgentRunId: null })).toBe(true);
    expect(back.admitsInbound({ kind: "owner", fromNodeId: "srv_alpha", targetAgentRunId: "writer-run" })).toBe(true);
    expect(back.admitsInbound({ kind: "owner", fromNodeId: "srv_alpha", targetAgentRunId: "b-local-copy" })).toBe(false);
    expect(back.admitsInbound({ kind: "owner", fromNodeId: "srv_other", targetAgentRunId: null })).toBe(false);
    expect(new RemoteRunLinks({ remoteRuns: () => [] }).admitsInbound({ kind: "owner", fromNodeId: "srv_alpha", targetAgentRunId: null })).toBe(false);
  });
});
