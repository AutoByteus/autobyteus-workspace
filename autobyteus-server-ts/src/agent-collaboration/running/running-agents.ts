import type { RunAgentAccess, RunAgentStatusEntry } from "../execution/remote/run-agent-access.js";
import type { RootExecutionIdentity, RootSubjectKind } from "../execution/domain/root-execution-identity.js";
import type { ActiveCollaborationRootDirectory } from "../execution/services/active-collaboration-root-directory.js";

/** A running agent of this node and the live root it runs in, with its status now. */
export type RunningAgentPlace = Readonly<{ root: RootExecutionIdentity; status: RunAgentStatusEntry }>;

/**
 * The one answer to "is this agent running on this node, and in which root" (autobyteus-492, design § Ownership Map). An
 * agent runs when its own live root reports it with a live status (`RunAgentAccess.runAgentStatuses`, offline left
 * out): a host ended by idle shutdown, a Team member not started yet and a stopped run do not run, although a root may
 * still be registered. It combines the live roots (`ActiveCollaborationRootDirectory`) with each root kind's statuses;
 * callers never combine the two themselves. Reads only; never restores or starts anything.
 */
export class RunningAgents {
  constructor(private readonly dependencies: Readonly<{
    roots: Pick<ActiveCollaborationRootDirectory, "liveRoots" | "resolve">;
    /** Each root kind's live statuses of its own agents (a standalone run's host; a Team's members; an Org's agents). */
    statuses(kind: RootSubjectKind): Pick<RunAgentAccess, "runAgentStatuses">;
  }>) {}

  /**
   * The live root this agent runs in, with its status; `null` when no live root of this node runs it. Decided from each
   * root's own statuses, never from run-ID membership: a root that only links the run ID (an agent on a peer) does not
   * run it.
   */
  rootOf(agentRunIdInput: string): RunningAgentPlace | null {
    const agentRunId = agentRunIdInput.trim();
    for (const root of this.dependencies.roots.liveRoots()) {
      const status = this.statusesOf(root).find((agent) => agent.agentRunId === agentRunId);
      if (status) return Object.freeze({ root, status });
    }
    return null;
  }

  /** The running agents of this live root, with their statuses now (an agent that is not live is left out). */
  statusesOf(root: RootExecutionIdentity): readonly RunAgentStatusEntry[] {
    return this.dependencies.statuses(root.rootSubjectKind).runAgentStatuses(root.rootRunId)
      .filter((agent) => agent.status !== "offline");
  }

  /** The live roots of this node (the listing's candidates). */
  liveRoots(): readonly RootExecutionIdentity[] {
    return this.dependencies.roots.liveRoots();
  }

  /**
   * The coordinator of a team run that is live on this node, from the team's own root (BEH-006 from a peer, AR-006);
   * `null` otherwise, including a team run a root of this node only delegated to another node.
   */
  teamCoordinatorOf(teamRunId: string): string | null {
    const team = this.dependencies.roots.resolve({ rootSubjectKind: "agent_team", rootRunId: teamRunId.trim() });
    return team?.teamCoordinatorOf?.(teamRunId.trim()) ?? null;
  }
}
