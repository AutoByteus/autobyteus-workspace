import { describe, expect, it, vi } from "vitest";
import { ActiveCollaborationRootDirectory } from "../../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootExecutionIdentity, RootSubjectKind } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { RunAgentStatusEntry } from "../../../../src/agent-collaboration/execution/remote/run-agent-access.js";
import { RunningAgents } from "../../../../src/agent-collaboration/running/running-agents.js";

/**
 * autobyteus-492 § Ownership Map: `RunningAgents` is the one answer to "is this agent running here, and in which root",
 * from each root's own live statuses (never from run-ID membership), and the coordinator of a team that runs here.
 */
const root = (rootSubjectKind: RootSubjectKind, rootRunId: string): RootExecutionIdentity => ({ rootSubjectKind, rootRunId }) as RootExecutionIdentity;
const status = (agentRunId: string, value: RunAgentStatusEntry["status"]): RunAgentStatusEntry => ({ agentRunId, status: value, backgroundTasksRunning: 0 });

const setup = () => {
  const directory = new ActiveCollaborationRootDirectory();
  const register = (identity: RootExecutionIdentity, members: readonly string[], extra: Record<string, unknown> = {}) =>
    directory.reserve(identity, { hasAgentExecution: (id: string) => members.includes(id), remoteNodeOf: () => null, ownsAgentRun: (id: string) => members.includes(id), deliverExactAgentMessage: vi.fn(), deliverToPeerRun: vi.fn(), ...extra }).commit();
  const statuses = new Map<string, readonly RunAgentStatusEntry[]>();
  const running = new RunningAgents({ roots: directory, statuses: (kind) => ({ runAgentStatuses: (runId) => statuses.get(`${kind}:${runId}`) ?? [] }) });
  return { directory, register, statuses, running };
};

describe("RunningAgents", () => {
  it("rootOf: the live root whose own statuses list the agent, with its status", () => {
    const f = setup();
    f.register(root("agent", "pm_1"), ["pm_1"]);
    f.register(root("agent_team", "team_1"), ["lead_1", "writer_1"]);
    f.statuses.set("agent:pm_1", [status("pm_1", "idle")]);
    f.statuses.set("agent_team:team_1", [status("lead_1", "running"), status("writer_1", "offline")]);
    expect(f.running.rootOf("pm_1")).toEqual({ root: root("agent", "pm_1"), status: status("pm_1", "idle") });
    expect(f.running.rootOf(" lead_1 ")).toEqual({ root: root("agent_team", "team_1"), status: status("lead_1", "running") });
    // A Team member not started yet reports offline: not running.
    expect(f.running.rootOf("writer_1")).toBeNull();
    expect(f.running.statusesOf(root("agent_team", "team_1"))).toEqual([status("lead_1", "running")]);
  });

  it("rootOf (residual risk of ARCH-REV-003): a root that only links the run ID (a peer run it delegated to) does not run it", () => {
    const f = setup();
    // The delegator's root claims the remote run ID by membership (its peer endpoint), as `placeOf` would see it.
    f.register(root("agent", "pm_1"), ["pm_1", "remote_b"]);
    f.statuses.set("agent:pm_1", [status("pm_1", "idle")]);
    expect(f.directory.placeOf("remote_b")).not.toBeNull();
    expect(f.running.rootOf("remote_b")).toBeNull();
  });

  it("rootOf: a registered root whose agent is not live (a host ended by idle shutdown, a stopped run) does not run it", () => {
    const f = setup();
    f.register(root("agent", "copy_1"), ["copy_1"]);
    expect(f.running.rootOf("copy_1")).toBeNull();
    expect(f.running.liveRoots()).toEqual([root("agent", "copy_1")]);
  });

  it("teamCoordinatorOf (AR-006): from the team's own live root; a team a root here only delegated to another node is null", () => {
    const f = setup();
    f.register(root("agent_team", "team_1"), ["lead_1"], { teamCoordinatorOf: (id: string) => id === "team_1" ? "lead_1" : null });
    // This root delegated team_c to node C: its own teamCoordinatorOf answers for it, but the team does not run here.
    f.register(root("agent", "pm_1"), ["pm_1"], { teamCoordinatorOf: (id: string) => id === "team_c" ? "lead_c" : null });
    expect(f.running.teamCoordinatorOf("team_1")).toBe("lead_1");
    expect(f.directory.findTeamCoordinator("team_c")).toBe("lead_c");
    expect(f.running.teamCoordinatorOf("team_c")).toBeNull();
    expect(f.running.teamCoordinatorOf("nobody")).toBeNull();
  });
});
