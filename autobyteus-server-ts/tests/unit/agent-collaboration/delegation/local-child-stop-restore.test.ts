import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity }
  from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { LocalChildObservation, type LocalChildPorts, type LocalChildRootEvent } from "../../../../src/agent-collaboration/execution/delegation/local-child-observation.js";
import type { DelegatedChild } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { StandalonePairedAgentAccess } from "../../../../src/standalone-agent-run-root/services/standalone-paired-agent-access.js";
import { TeamPairedAgentAccess } from "../../../../src/agent-team-execution/services/team-paired-agent-access.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../../src/agent-team-execution/domain/team-run-event.js";

/**
 * autobyteus-461 CR-461-067 (T-4, rule 1, SR-064): a delegator's open view follows a local delegated run across its Stop
 * and its restore, through each root kind's real access: at the Stop the row's agents read `offline` (a member whose
 * start failed too); the restored run's statuses reach the view.
 */
const MANAGER = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const child = (run: DelegatedChild["run"], address: string): DelegatedChild => ({
  run, taskId: "T1", delegatorAgentRunId: "manager", entryAgentRunId: "agentRunId" in run ? run.agentRunId : "lead",
  started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: address,
});
const settle = async () => { for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); };
const statusesOf = (events: LocalChildRootEvent[]) => events.map((event) => `${event.agentRunId}:${(event.message.payload as { status: string }).status}`);

const view = (children: DelegatedChild[], agents: Record<string, { agentRunId: string; address: string }[]>,
  access: (kind: "agent" | "agent_team") => unknown) => {
  let rows = children;
  const listeners = new Set<() => void>();
  const ports: LocalChildPorts = {
    tree: ({ collaborationTreeOf: () => ({ rows: () => rows }) as never, subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
      agentsOf: async (run) => (agents[run.rootRunId] ?? []).map((agent) => ({ ...agent, agentDefinitionId: null })) }),
    agents: (kind) => access(kind) as never,
  };
  const events: LocalChildRootEvent[] = [];
  const observation = new LocalChildObservation({ run: MANAGER, publish: (event) => events.push(event), ports });
  observation.viewerAttached();
  return { observation, events, closeRows: () => { rows = []; listeners.forEach((listener) => listener()); } };
};

/** A standalone run's root as the manager serves it: a Stop ends the run (its root goes); a restore is a new root. */
const agentRuns = () => {
  const statusEvent = (status: string): AgentRunEvent =>
    ({ eventType: AgentRunEventType.AGENT_STATUS, runId: "writer", payload: { status }, statusHint: null }) as AgentRunEvent;
  const host = () => {
    const listeners = new Set<(event: AgentRunEvent) => void>();
    return { runId: "writer", isActive: () => true, getStatusSnapshot: () => ({ status: "idle" }),
      subscribeToEvents: (listener: (event: AgentRunEvent) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
      emit: (status: string) => listeners.forEach((listener) => listener(statusEvent(status))) };
  };
  const newRoot = () => {
    const ready = new Set<(run: unknown) => void>();
    let live: ReturnType<typeof host> | null = null;
    return { hostRunId: "writer", hostAddress: "/writer", rootIdentity: createAgentRootExecutionIdentity("writer"), activeHostRun: () => live,
      onHostReady: (listener: (run: unknown) => void) => { ready.add(listener); return () => ready.delete(listener); },
      start: () => { live = host(); ready.forEach((listener) => listener(live)); return live; } };
  };
  let root = newRoot();
  const ended = new Set<() => void>();
  const resolveRoot = vi.fn(async () => root);
  const access = new StandalonePairedAgentAccess({ resolveRoot, getActive: () => root as never, stopRoot: vi.fn(),
    onRunEnded: (_id: string, listener: () => void) => { ended.add(listener); return () => ended.delete(listener); } } as never);
  return { access, resolveRoot, root: () => root,
    stop: () => { root = newRoot(); [...ended].forEach((listener) => listener()); } };
};

/** A team run as its manager serves it: a Stop ends its root (lifecycle `stopped`); the next message restores a new root. */
const teamRuns = () => {
  const memberEvent = (agentRunId: string, status: string): TeamRunEvent => ({
    eventSourceType: TeamRunEventSourceType.AGENT,
    execution: createCollaborationMemberExecutionIdentity({ root: createTeamRootExecutionIdentity("eng"), memberAddress: `/${agentRunId}` as never, agentRunId }),
    payload: { eventType: "AGENT_STATUS", details: { status, trigger: null, toolName: null, errorMessage: null, errorDetails: null, recoverableBlock: null }, statusHint: null },
  } as never);
  const newRoot = () => {
    const listeners = new Set<(sequenced: { event: TeamRunEvent }) => void>();
    return { isActive: () => true,
      getExecutionTreeSnapshot: () => ({ rootTeam: { members: ["lead", "writer"].map((agentRunId) => ({ address: `/${agentRunId}`, agentRunId })) } }),
      subscribeToEvents: (listener: (sequenced: { event: TeamRunEvent }) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
      getLeafAgentStatusSnapshots: () => [],
      emit: (agentRunId: string, status: string) => listeners.forEach((listener) => listener({ event: memberEvent(agentRunId, status) })) };
  };
  let root: ReturnType<typeof newRoot> | null = newRoot();
  const lifecycle = new Set<(snapshot: { isActive: boolean; ending: string | null }) => void>();
  const access = new TeamPairedAgentAccess({ getManagedTeamRun: () => root as never, resolveManagedTeamRun: async () => root as never,
    subscribeToLifecycle: (_id, listener) => { lifecycle.add(listener as never); return () => lifecycle.delete(listener as never); },
    terminateTeamRun: vi.fn(async () => true) });
  const notify = (snapshot: { isActive: boolean; ending: string | null }) => [...lifecycle].forEach((listener) => listener(snapshot));
  return { access, root: () => root!, lifecycle,
    stop: () => { root = null; notify({ isActive: false, ending: "stopped" }); },
    restore: () => { root = newRoot(); notify({ isActive: true, ending: null }); return root; } };
};

describe("CR-461-067: a delegator's open view follows a local delegated run across its Stop and restore", () => {
  it("an agent row: offline at the Stop; the restored run's statuses reach the view", async () => {
    const runs = agentRuns();
    const v = view([child({ agentRunId: "writer" }, "/writer")], { writer: [{ agentRunId: "writer", address: "/writer" }] }, () => runs.access);
    await settle();
    runs.root().start().emit("running");
    runs.stop();
    await settle();
    // The restore: the next message starts the run's agent on the root loaded after the Stop.
    runs.root().start().emit("running");
    expect(statusesOf(v.events)).toEqual(["writer:running", "writer:offline", "writer:running"]);
    expect(runs.resolveRoot).toHaveBeenCalledTimes(2);
    v.observation.dispose();
  });

  it("a team row: each member offline at the Stop (a member whose start failed too); the restored root's statuses reach the view", async () => {
    const runs = teamRuns();
    const v = view([child({ teamRunId: "eng" }, "/eng")], { eng: [{ agentRunId: "lead", address: "/eng/lead" }, { agentRunId: "writer", address: "/eng/writer" }] },
      () => runs.access);
    await settle();
    runs.root().emit("lead", "idle");
    runs.root().emit("writer", "error");
    runs.stop();
    await settle();
    runs.restore().emit("lead", "running");
    expect(statusesOf(v.events)).toEqual(["lead:idle", "writer:error", "lead:offline", "writer:offline", "lead:running"]);
    v.observation.dispose();
    expect(runs.lifecycle.size).toBe(0);
  });

  it("a row that left the view (its run deleted, or its Task closed) is not followed again after its run ends", async () => {
    const runs = teamRuns();
    const v = view([child({ teamRunId: "eng" }, "/eng")], { eng: [{ agentRunId: "lead", address: "/eng/lead" }] }, () => runs.access);
    await settle();
    v.closeRows();
    await settle();
    runs.stop();
    await settle();
    expect(runs.lifecycle.size).toBe(0);
    expect(statusesOf(v.events)).toEqual([]);
  });
});
