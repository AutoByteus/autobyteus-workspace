import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TaskExecutionResourcePort } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { TaskAgentOwnFiles } from "../store/task-agent-own-files.js";

/** An agent of a top run's closed delegated run: its run ID and the address it had in the tree. */
export type ClosedRunAgent = Readonly<{ agentRunId: string; address: AgentTeamAddress }>;

type ClosedRuns = Pick<TaskExecutionResourcePort, "closedTaskExecutionsIn" | "closedTaskExecutionOf">;

let boundClosedRuns: ClosedRuns | null = null;
/** The composition binds the loaded Task side once (`project-task-execution-resource-composition.ts`). */
export const bindClosedDelegatedRuns = (port: ClosedRuns): void => { boundClosedRuns = port; };
export const unbindClosedDelegatedRuns = (port: ClosedRuns): void => { if (boundClosedRuns === port) boundClosedRuns = null; };

/**
 * The agents of a top run's closed delegated runs (design D-5, D-7): the runs are the Task records' closed copies of
 * this top run, their agents and addresses come from each run's own file. A run whose own file cannot be read is left
 * out with one warning naming it (DESIGN.md rule 7). Reads only what is asked.
 */
export class ClosedDelegatedRunReader {
  private readonly files: TaskAgentOwnFiles;

  /** `closedRuns`: the Task side; by default the bound one (none before the Task records are loaded: no closed run). */
  constructor(memoryDir: string, private readonly closedRuns: () => ClosedRuns | null = () => boundClosedRuns) {
    this.files = new TaskAgentOwnFiles(memoryDir);
  }

  /**
   * The given agent run IDs that are agents of a closed delegated run of this top run, with their addresses. An agent
   * run or a Team's coordinator is found by the Task record; another Team member by reading the closed Teams' files.
   */
  async forAgentRunIds(root: RootExecutionIdentity, agentRunIds: Iterable<string>): Promise<ClosedRunAgent[]> {
    const port = this.closedRuns();
    const wanted = new Set(agentRunIds);
    if (!port || !wanted.size) return [];
    const found = new Map<string, ClosedRunAgent>();
    const read = new Set<string>();
    const take = async (run: TaskExecutionReference) => {
      const key = "agentRunId" in run ? `agent:${run.agentRunId}` : `team:${run.teamRunId}`;
      if (read.has(key)) return;
      read.add(key);
      for (const agent of await this.agentsOf(root, run)) if (wanted.has(agent.agentRunId)) found.set(agent.agentRunId, agent);
    };
    for (const agentRunId of wanted) {
      const closed = port.closedTaskExecutionOf(root, { ingressAgentRunId: agentRunId });
      if (closed) await take(closed.execution);
    }
    if (found.size < wanted.size) {
      for (const run of port.closedTaskExecutionsIn(root)) {
        if ("teamRunId" in run) await take(run);
        if (found.size === wanted.size) break;
      }
    }
    return [...found.values()];
  }

  /** Every agent run ID of this top run's closed delegated runs. */
  async agentRunIds(root: RootExecutionIdentity): Promise<string[]> {
    const runs = this.closedRuns()?.closedTaskExecutionsIn(root) ?? [];
    return (await Promise.all(runs.map((run) => "agentRunId" in run ? [run.agentRunId]
      : this.agentsOf(root, run).then((agents) => agents.map((agent) => agent.agentRunId))))).flat();
  }

  private async agentsOf(root: RootExecutionIdentity, run: TaskExecutionReference): Promise<ClosedRunAgent[]> {
    const runId = "agentRunId" in run ? run.agentRunId : run.teamRunId;
    const state = "agentRunId" in run ? await this.files.readAgent(run.agentRunId) : await this.files.readTeam(run.teamRunId);
    if (state.kind !== "present") {
      if (state.kind === "unreadable") {
        console.warn(`Closed delegated run '${runId}' of ${root.rootSubjectKind} run '${root.rootRunId}' cannot be read: ${state.error.message}`);
      }
      return [];
    }
    return "metadata" in state
      ? [{ agentRunId: state.metadata.runId, address: state.metadata.taskAgent.address }]
      : state.tree.rootTeam.members.map((member) => ({ agentRunId: member.agentRunId, address: member.address }));
  }
}
