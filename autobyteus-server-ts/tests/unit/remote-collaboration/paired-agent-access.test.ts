import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity }
  from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { StandalonePairedAgentAccess } from "../../../src/standalone-agent-run-root/services/standalone-paired-agent-access.js";
import { TeamPairedAgentAccess, teamMemberPresentationOf } from "../../../src/agent-team-execution/services/team-paired-agent-access.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";

/** autobyteus-278 AR-401: each root kind's own source of a peer-started run's output, commands and readiness. */

const OWNER = { nodeName: "alpha" };
const post = { kind: "post_message" as const, content: "status?", messageId: "m1", dedupeKey: "d1" };
const statusEvent = (runId: string, status: string): AgentRunEvent =>
  ({ eventType: AgentRunEventType.AGENT_STATUS, runId, payload: { status }, statusHint: status === "running" ? "ACTIVE" : "IDLE" }) as AgentRunEvent;

const fakeHost = (runId: string) => {
  const listeners = new Set<(event: AgentRunEvent) => void>();
  return {
    runId,
    listeners,
    isActive: () => true,
    getStatusSnapshot: () => ({ status: "idle" }),
    interrupt: vi.fn(async () => ({ accepted: true })),
    subscribeToEvents: (listener: (event: AgentRunEvent) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    emit: (event: AgentRunEvent) => listeners.forEach((listener) => listener(event)),
  };
};

const standalone = () => {
  const hostReady = new Set<(run: unknown) => void>();
  let live: ReturnType<typeof fakeHost> | null = fakeHost("host-run");
  const root = {
    hostRunId: "host-run", hostAddress: "/researcher", rootIdentity: createAgentRootExecutionIdentity("host-run"),
    activeHostRun: () => live,
    onHostReady: (listener: (run: unknown) => void) => { hostReady.add(listener); return () => hostReady.delete(listener); },
    postHostUserMessage: vi.fn(async () => ({ kind: "posted" as const, run: live, post: { accepted: true } })),
  };
  const ended = new Set<() => void>();
  const roots = { resolveRoot: vi.fn(async () => root), getActive: vi.fn(() => root), stopRoot: vi.fn(async () => ({ rootEnded: true, host: { outcome: "terminated" as const, runtimeKind: null } })),
    onRunEnded: (_hostRunId: string, listener: () => void) => { ended.add(listener); return () => ended.delete(listener); } };
  return {
    root, roots, access: new StandalonePairedAgentAccess(roots as never), hostReady, ended,
    /** The manager reports the run ended (Stop, terminate or delete by any path), after its host stopped. */
    end: () => [...ended].forEach((listener) => listener()),
    host: () => live!,
    restore: () => { live = fakeHost("host-run"); hostReady.forEach((listener) => listener(live)); return live; },
    idle: () => { live = null; },
  };
};

describe("StandalonePairedAgentAccess (a remote Agent)", () => {
  it("presents the host's events and follows a restored host through the root's host-ready hook", async () => {
    const f = standalone();
    const frames: [string, string][] = [];
    const onEnded = vi.fn();
    const observation = (await f.access.observePairedAgents("host-run", (agentRunId, message) => frames.push([agentRunId, message.type]), onEnded))!;
    f.host().emit(statusEvent("host-run", "running"));
    const first = f.host();
    f.idle();
    const restored = f.restore();
    first.emit(statusEvent("host-run", "idle"));
    restored.emit(statusEvent("host-run", "idle"));
    expect(frames).toEqual([["host-run", "AGENT_STATUS"], ["host-run", "AGENT_STATUS"]]);
    expect(first.listeners.size).toBe(0);
    observation.close();
    expect(restored.listeners.size).toBe(0);
    expect(f.hostReady.size).toBe(0);
    expect(f.ended.size).toBe(0);
    // Idle shutdown and the restore did not end it; only A closed it.
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("ends when the run ends by any path (not on idle shutdown): onEnded once, and every subscription released (F-004)", async () => {
    const f = standalone();
    const onEnded = vi.fn();
    const frames: string[] = [];
    const observation = (await f.access.observePairedAgents("host-run", (agentRunId) => frames.push(agentRunId), onEnded))!;
    f.idle();
    const restored = f.restore();
    expect(onEnded).not.toHaveBeenCalled();
    f.end();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(restored.listeners.size).toBe(0);
    expect(f.hostReady.size).toBe(0);
    expect(f.ended.size).toBe(0);
    restored.emit(statusEvent("host-run", "idle"));
    expect(frames).toEqual([]);
    observation.close();
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("posts the owner's message as user input under the owner heading, interrupts the host and stops the root", async () => {
    const f = standalone();
    await expect(f.access.executeOwnerCommand("host-run", "host-run", post, OWNER)).resolves.toEqual({ accepted: true });
    const [{ message }] = f.root.postHostUserMessage.mock.calls[0] as unknown as [{ message: { content: string; metadata: Record<string, unknown> } }];
    // DS-004a: the mark is a content heading; the IDs pass through unchanged (N-405) and no other metadata is added.
    expect(message.content).toBe('From the owner of node "alpha":\n\nstatus?');
    expect(message.metadata).toEqual({ input_origin: "user_message", message_id: "m1", dedupe_key: "d1" });
    await f.access.executeOwnerCommand("host-run", "host-run", { kind: "interrupt" }, OWNER);
    expect(f.host().interrupt).toHaveBeenCalledTimes(1);
    await expect(f.access.executeOwnerCommand("host-run", "host-run", { kind: "terminate" }, OWNER)).resolves.toEqual({ accepted: true });
    expect(f.roots.stopRoot).toHaveBeenCalledWith("host-run");
    await expect(f.access.executeOwnerCommand("host-run", "other-run", post, OWNER)).resolves.toMatchObject({ accepted: false, code: "TARGET_NOT_PERMITTED" });
    expect(f.access.pairedAgentStatuses("host-run")).toEqual([{ agentRunId: "host-run", status: "idle" }]);
    f.idle();
    expect(f.access.pairedAgentStatuses("host-run")).toEqual([]);
    await expect(f.access.executeOwnerCommand("host-run", "host-run", { kind: "interrupt" }, OWNER)).resolves.toMatchObject({ accepted: false, code: "RUN_NOT_ACTIVE" });
  });
});

const teamRoot = (members: string[]) => {
  const listeners = new Set<(sequenced: { event: TeamRunEvent }) => void>();
  return {
    listeners,
    isActive: () => true,
    getExecutionTreeSnapshot: () => ({ rootTeam: { members: members.map((agentRunId) => ({ address: `/team/${agentRunId}`, agentRunId })) } }),
    subscribeToEvents: (listener: (sequenced: { event: TeamRunEvent }) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    getLeafAgentStatusSnapshots: () => ["lead-run", "copy-run"].map((agentRunId) => ({ execution: { agentRunId }, details: { status: "running" } })),
    executeAgentCommand: vi.fn(async () => ({ accepted: true })),
    emit: (event: TeamRunEvent) => listeners.forEach((listener) => listener({ event })),
  };
};
const agentEvent = (agentRunId: string): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.AGENT,
  execution: createCollaborationMemberExecutionIdentity({ root: createTeamRootExecutionIdentity("team-run"), memberAddress: `/team/${agentRunId}` as never, agentRunId }),
  payload: { eventType: "TURN_STARTED", details: { turnId: "t1" }, statusHint: null },
} as never);

describe("TeamPairedAgentAccess (a remote Team)", () => {
  it("sends its members' output only, and follows the root across a quiet shutdown and a restore", async () => {
    let managed: ReturnType<typeof teamRoot> | null = teamRoot(["lead-run", "writer-run"]);
    const lifecycle = new Set<(snapshot: { isActive: boolean; ending: string | null }) => void>();
    const access = new TeamPairedAgentAccess({
      getManagedTeamRun: () => managed as never,
      resolveManagedTeamRun: async () => managed as never,
      subscribeToLifecycle: (_id, listener) => { lifecycle.add(listener as never); return () => lifecycle.delete(listener as never); },
      terminateTeamRun: vi.fn(async () => true),
    });
    const frames: string[] = [];
    const onEnded = vi.fn();
    const observation = await access.observePairedAgents("team-run", (agentRunId) => frames.push(agentRunId), onEnded);
    managed!.emit(agentEvent("lead-run"));
    managed!.emit(agentEvent("copy-run"));
    const first = managed!;
    managed = null;
    lifecycle.forEach((listener) => listener({ isActive: false, ending: "idle_shutdown" }));
    expect(first.listeners.size).toBe(0);
    managed = teamRoot(["lead-run", "writer-run"]);
    lifecycle.forEach((listener) => listener({ isActive: true, ending: null }));
    managed.emit(agentEvent("writer-run"));
    expect(frames).toEqual(["lead-run", "writer-run"]);
    expect(access.pairedAgentStatuses("team-run")).toEqual([{ agentRunId: "lead-run", status: "running" }]);
    expect(onEnded).not.toHaveBeenCalled();
    observation.close();
    expect(lifecycle.size).toBe(0);
    expect(managed.listeners.size).toBe(0);
  });

  it("ends when the Team run is stopped by any path (lifecycle ending 'stopped'), but not on idle shutdown (F-004)", async () => {
    const managed = teamRoot(["lead-run"]);
    const lifecycle = new Set<(snapshot: { isActive: boolean; ending: string | null }) => void>();
    const access = new TeamPairedAgentAccess({ getManagedTeamRun: () => managed as never, resolveManagedTeamRun: async () => managed as never,
      subscribeToLifecycle: (_id, listener) => { lifecycle.add(listener as never); return () => lifecycle.delete(listener as never); },
      terminateTeamRun: vi.fn(async () => true) });
    const onEnded = vi.fn();
    await access.observePairedAgents("team-run", () => undefined, onEnded);
    lifecycle.forEach((listener) => listener({ isActive: false, ending: "stopped" }));
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(lifecycle.size).toBe(0);
    expect(managed.listeners.size).toBe(0);
  });

  it("posts and interrupts through the member command path and terminates the Team run", async () => {
    const managed = teamRoot(["lead-run"]);
    const terminateTeamRun = vi.fn(async () => true);
    const access = new TeamPairedAgentAccess({ getManagedTeamRun: () => managed as never, resolveManagedTeamRun: async () => managed as never,
      subscribeToLifecycle: () => () => undefined, terminateTeamRun });
    await access.executeOwnerCommand("team-run", "lead-run", post, OWNER);
    expect(managed.executeAgentCommand.mock.calls[0]![0]).toBe("lead-run");
    expect((managed.executeAgentCommand.mock.calls[0]![1] as unknown as { kind: string }).kind).toBe("post_message");
    await access.executeOwnerCommand("team-run", "lead-run", { kind: "interrupt" }, OWNER);
    expect(managed.executeAgentCommand).toHaveBeenLastCalledWith("lead-run", { kind: "interrupt" });
    await expect(access.executeOwnerCommand("team-run", "lead-run", { kind: "terminate" }, OWNER)).resolves.toEqual({ accepted: true });
    expect(terminateTeamRun).toHaveBeenCalledWith("team-run");
  });

  it("a member input becomes the presentation MEMBER_INPUT_MESSAGE of its recipient", () => {
    const frame = teamMemberPresentationOf({ eventSourceType: TeamRunEventSourceType.MEMBER_INPUT, agentRunId: "lead-run", payload: {
      recipientAgentRunId: "lead-run", messageId: "m1", dedupeKey: "d1", content: "status?", inputOrigin: "user_message",
      receivedAt: "2026-10-23T08:00:00.000Z", contextFilePaths: [], senderAgentRunId: null, parentCommunicationMessageId: null,
    } });
    expect(frame).toEqual({ agentRunId: "lead-run", message: { type: "MEMBER_INPUT_MESSAGE", payload: {
      message_id: "m1", dedupe_key: "d1", content: "status?", input_origin: "user_message", received_at: "2026-10-23T08:00:00.000Z",
      context_file_paths: [], sender_agent_run_id: null, parent_communication_message_id: null,
    } } });
    expect(teamMemberPresentationOf({ eventSourceType: TeamRunEventSourceType.TASK_EXECUTIONS_CLOSED, taskExecutions: [] })).toBeNull();
  });
});
