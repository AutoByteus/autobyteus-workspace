import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { runIdentityOf } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";

/** An agent of a run delegated from a run: its run ID and its own address in its run. */
export type DelegatedRunAgent = Readonly<{ agentRunId: string; address: AgentTeamAddress }>;

/** The runs delegated from a run on this node, open or closed, and each run's agents: the `DelegationIndex` (contract §4). */
type DelegatedRuns = Pick<DelegationIndex, "subtreeOf" | "agentsOf" | "collaborationTreeOf">;

/** An Org container's unit runs (org-teams-follow-definition): the runs that delegate on its behalf. */
type ContainerUnits = Readonly<{
  unitRunsOf(orgRunId: string): readonly RootExecutionIdentity[] | null;
  loadContainer(orgRunId: string): Promise<unknown>;
}>;

/**
 * The agents of the runs delegated from a run, open and closed (REQ-009's token roll-up of every run kind; the Team tab's
 * past participants): the runs come from the Task entries; each run's agents from the tree, their one owner (read once
 * per run; a run that cannot be read is left out, with the tree's warning). Reads only what is asked.
 */
export class DelegatedRunAgentsReader {
  /** `delegatedRuns`: the tree, created by the composition root (SR-047). */
  constructor(private readonly delegatedRuns: DelegatedRuns, private readonly containers: ContainerUnits | null = null) {}

  /** Reads a stored Org container once, so its units answer synchronously (`openRunsBelow`). */
  async prepare(root: RootExecutionIdentity): Promise<void> {
    if (root.rootSubjectKind === "agent_org") await this.containers?.loadContainer(root.rootRunId);
  }

  /** The runs whose delegations are this run's: the run, and an Org container's unit runs (a container delegates nothing itself). */
  private holders(root: RootExecutionIdentity): readonly RootExecutionIdentity[] {
    return root.rootSubjectKind === "agent_org" ? [root, ...(this.containers?.unitRunsOf(root.rootRunId) ?? [])] : [root];
  }

  private async subtreeOf(root: RootExecutionIdentity): Promise<readonly TaskExecutionReference[]> {
    await this.prepare(root);
    return this.holders(root).flatMap((holder) => this.delegatedRuns.subtreeOf(holder));
  }

  /**
   * The given agent run IDs that are agents of a run below this run, at every depth, open or closed, with their own
   * addresses (the Team tab's past participants: its view composes the whole subtree's logs, SR-072).
   */
  async forAgentRunIds(root: RootExecutionIdentity, agentRunIds: Iterable<string>): Promise<DelegatedRunAgent[]> {
    const wanted = new Set(agentRunIds);
    if (!wanted.size) return [];
    const found: DelegatedRunAgent[] = [];
    for (const run of await this.subtreeOf(root)) {
      for (const agent of await this.agentsOf(run)) if (wanted.has(agent.agentRunId)) found.push(agent);
    }
    return found;
  }

  /**
   * The local runs of this run's open subtree, at every depth: its view's rows (SR-072, SR-074), whose logs its Team tab
   * composes and whose agents are its tree. A peer's run is left out: its messages stay on its node.
   */
  openRunsBelow(root: RootExecutionIdentity): readonly TaskExecutionReference[] {
    return this.holders(root).flatMap((holder) => this.delegatedRuns.collaborationTreeOf(holder).rows().flatMap((row) => row.nodeId === undefined ? [row.run] : []));
  }

  /** Every agent run ID of every run delegated from this run, one hop at a time and recursively (token totals). */
  async agentRunIds(root: RootExecutionIdentity): Promise<string[]> {
    const runs = await this.subtreeOf(root);
    return (await Promise.all(runs.map((run) => this.agentsOf(run)))).flat().map((agent) => agent.agentRunId);
  }

  /** A delegated run's agents; each has an address (a delegated agent run's is the one it was delegated to until stored). */
  private async agentsOf(run: TaskExecutionReference): Promise<DelegatedRunAgent[]> {
    return (await this.delegatedRuns.agentsOf(runIdentityOf(run)))
      .flatMap((agent) => agent.address ? [{ agentRunId: agent.agentRunId, address: agent.address as AgentTeamAddress }] : []);
  }
}
