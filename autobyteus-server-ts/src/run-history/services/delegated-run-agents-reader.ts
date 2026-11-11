import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { runIdentityOf } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { DelegationTree } from "../../agent-collaboration/delegation/delegation-tree.js";
import { RunOwnAgentsReader } from "../store/run-own-agents-reader.js";

/** An agent of a run delegated from a run: its run ID and its own address in its run. */
export type DelegatedRunAgent = Readonly<{ agentRunId: string; address: AgentTeamAddress }>;

/** The runs delegated from a run on this node, open or closed: the `DelegationTree` (contract §4). */
type DelegatedRuns = Pick<DelegationTree, "childrenOf" | "subtreeOf">;

let boundDelegatedRuns: DelegatedRuns | null = null;
/** The composition binds the loaded tree once (`project-task-execution-resource-composition.ts`). */
export const bindDelegatedRuns = (port: DelegatedRuns): void => { boundDelegatedRuns = port; };
export const unbindDelegatedRuns = (port: DelegatedRuns): void => { if (boundDelegatedRuns === port) boundDelegatedRuns = null; };

/**
 * The agents of the runs delegated from a run, open and closed (REQ-009's token roll-up of every run kind; the Team tab's
 * past participants): the runs come from the Task entries; each run's agents and addresses from its own file. A run whose own file cannot
 * be read gives none of its members (an agent run still gives its own ID). Reads only what is asked.
 */
export class DelegatedRunAgentsReader {
  private readonly own: RunOwnAgentsReader;

  /** `delegatedRuns`: the tree; by default the bound one (none before the Task records are loaded: no delegated run). */
  constructor(memoryDir: string, private readonly delegatedRuns: () => DelegatedRuns | null = () => boundDelegatedRuns) {
    this.own = new RunOwnAgentsReader(memoryDir);
  }

  /** The given agent run IDs that are agents of a run delegated from this run (one hop), with their own addresses. */
  async forAgentRunIds(root: RootExecutionIdentity, agentRunIds: Iterable<string>): Promise<DelegatedRunAgent[]> {
    const wanted = new Set(agentRunIds);
    if (!wanted.size) return [];
    const found: DelegatedRunAgent[] = [];
    for (const run of this.delegatedRuns()?.childrenOf(root) ?? []) {
      for (const agent of await this.agentsOf(run)) if (wanted.has(agent.agentRunId)) found.push(agent);
    }
    return found;
  }

  /** Every agent run ID of every run delegated from this run, one hop at a time and recursively (token totals). */
  async agentRunIds(root: RootExecutionIdentity): Promise<string[]> {
    const runs = this.delegatedRuns()?.subtreeOf(root) ?? [];
    return (await Promise.all(runs.map((run) => this.agentsOf(run)))).flat().map((agent) => agent.agentRunId);
  }

  private async agentsOf(run: TaskExecutionReference): Promise<DelegatedRunAgent[]> {
    const standing = await this.own.standingOf(runIdentityOf(run)).catch(() => null);
    if (standing?.agents.size) return [...standing.agents].map(([address, agentRunId]) => ({ agentRunId, address: address as AgentTeamAddress }));
    return "agentRunId" in run ? [{ agentRunId: run.agentRunId, address: "/" as AgentTeamAddress }] : [];
  }
}
