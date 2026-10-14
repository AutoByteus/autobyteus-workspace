import type {
  CollaboratorEntry,
  TaskExecution,
  TaskTeamMemberExecution,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentTeamAddress } from "./agent-team-address.js";
import type { DelegatedLaunchForest, DelegatedRunReference } from "./delegated-launch-selection.js";

/** The Stop target: one delegated copy (Agent or Team) or one collaborator, by its run identity. */
export type DelegatedStopTarget = DelegatedRunReference;

export type DelegatedStopSet = Readonly<{
  /** The collaborator itself, when the target is one (stopped through its host, not the task queue). */
  collaborator: Readonly<{ address: AgentTeamAddress; agentRunIds: readonly string[] }> | null;
  /** Task copies to stop, innermost first; the target copy (when it is one) is last. */
  executions: readonly DelegatedRunReference[];
  /** Every AgentRun inside the set (the collaborator's and every listed copy's agents). */
  agentRunIds: ReadonlySet<string>;
  /**
   * Copies recorded before delegators were recorded (no `delegatorAgentRunId`) and not contained in
   * the set: they cannot be attributed, so they are not stopped (AR-002 limit).
   */
  unattributed: readonly DelegatedRunReference[];
}>;

type Node = Readonly<{
  reference: DelegatedRunReference;
  key: string;
  delegatorAgentRunId?: string;
  /** The Team copy (or collaborator Team) whose TeamRun hosts this copy, by key. */
  hostKey: string | null;
  agentRunIds: readonly string[];
}>;

const keyOf = (reference: DelegatedRunReference): string =>
  "agentRunId" in reference ? `agent:${reference.agentRunId}` : `team:${reference.teamRunId}`;

const memberAgentRunIds = (members: readonly TaskTeamMemberExecution[]): string[] =>
  members.flatMap((member) => "agentRunId" in member ? [member.agentRunId] : memberAgentRunIds(member.members));

/**
 * AR-002: the Stop set of a copy or collaborator X is X plus, recursively, every task copy whose
 * delegator is an agent of the set (Task helpers record their requesting agent as delegator too) and
 * every copy hosted inside a Team of the set (its TeamRun stops with it). Evaluated over all
 * task-execution lists of the tree. Innermost first: deeper descendants before their ancestors.
 * `null` when the target is no delegated copy or collaborator of the tree.
 */
export const delegatedStopSet = (forest: DelegatedLaunchForest, target: DelegatedStopTarget): DelegatedStopSet | null => {
  const nodes: Node[] = [];
  const collect = (tasks: readonly TaskExecution[], hostKey: string | null): void => {
    for (const task of tasks) {
      const reference: DelegatedRunReference = "agentRunId" in task ? { agentRunId: task.agentRunId } : { teamRunId: task.teamRunId };
      const key = keyOf(reference);
      nodes.push({
        reference, key, hostKey,
        ...(task.delegatorAgentRunId !== undefined ? { delegatorAgentRunId: task.delegatorAgentRunId } : {}),
        agentRunIds: "agentRunId" in task ? [task.agentRunId] : memberAgentRunIds(task.members),
      });
      if ("teamRunId" in task) {
        collect(task.taskExecutions, key);
        const nested = (members: readonly TaskTeamMemberExecution[]): void => members.forEach((member) => {
          if ("teamRunId" in member) { collect(member.taskExecutions, key); nested(member.members); }
        });
        nested(task.members);
      }
    }
  };
  const collaboratorKeys = new Map<string, CollaboratorEntry>();
  for (const entry of forest.collaborators) {
    if (entry.kind === "agent_team") {
      collaboratorKeys.set(`team:${entry.teamRunId}`, entry);
      collect(entry.taskExecutions, `team:${entry.teamRunId}`);
    } else collaboratorKeys.set(`agent:${entry.agentRunId}`, entry);
  }
  const collaboratorLists = new Set(forest.collaborators.flatMap((entry) => entry.kind === "agent_team" ? [entry.taskExecutions] : []));
  forest.taskExecutionLists.filter((list) => !collaboratorLists.has(list)).forEach((list) => collect(list, null));

  const targetKey = keyOf(target);
  const collaborator = collaboratorKeys.get(targetKey) ?? null;
  const targetNode = nodes.find((node) => node.key === targetKey) ?? null;
  if (!collaborator && !targetNode) return null;

  const depth = new Map<string, number>([[targetKey, 0]]);
  /** Depth of the set member containing each agent: a copy delegated by that agent is one deeper. */
  const agentDepth = new Map<string, number>();
  const collaboratorAgents = collaborator
    ? (collaborator.kind === "agent" ? [collaborator.agentRunId] : collaborator.members.map((member) => member.agentRunId))
    : targetNode!.agentRunIds;
  collaboratorAgents.forEach((id) => agentDepth.set(id, 0));
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of nodes) {
      if (depth.has(node.key)) continue;
      const parent = (node.hostKey !== null ? depth.get(node.hostKey) : undefined)
        ?? (node.delegatorAgentRunId !== undefined ? agentDepth.get(node.delegatorAgentRunId) : undefined);
      if (parent === undefined) continue;
      depth.set(node.key, parent + 1);
      node.agentRunIds.forEach((id) => { if (!agentDepth.has(id)) agentDepth.set(id, parent + 1); });
      grew = true;
    }
  }
  const agentRunIds = new Set(agentDepth.keys());
  const executions = nodes.filter((node) => depth.has(node.key))
    .sort((left, right) => depth.get(right.key)! - depth.get(left.key)!)
    .map((node) => node.reference);
  return Object.freeze({
    collaborator: collaborator ? Object.freeze({
      address: collaborator.address,
      agentRunIds: Object.freeze(collaborator.kind === "agent" ? [collaborator.agentRunId] : collaborator.members.map((member) => member.agentRunId)),
    }) : null,
    executions: Object.freeze(executions),
    agentRunIds,
    unattributed: Object.freeze(nodes.filter((node) => !depth.has(node.key) && node.delegatorAgentRunId === undefined).map((node) => node.reference)),
  });
};
