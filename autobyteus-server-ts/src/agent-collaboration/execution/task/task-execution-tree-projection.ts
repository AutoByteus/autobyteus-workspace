import type {
  TaskAgentExecution,
  TaskAgentExecutionSource,
  TaskExecutionSource,
  TaskTeamExecution,
  TaskTeamAgentExecution,
  TaskTeamExecutionSource,
} from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode } from "../../../agent-team-execution/domain/team-run-config.js";

const member = (node: TeamRunAgentNode): TaskTeamAgentExecution => Object.freeze({
  address: node.address,
  agentRunId: node.agentRunId,
  platformAgentRunId: node.platformAgentRunId,
});

export const projectTaskAgentExecution = (input: {
  address: TaskAgentExecution["address"];
  agentRunId: string;
  delegatorAgentRunId: string;
  startedAt: string;
  /** The snapshot the copy started from (its placement's). */
  source: TaskAgentExecutionSource;
}): TaskAgentExecution => Object.freeze({
  address: input.address,
  agentRunId: input.agentRunId,
  platformAgentRunId: null,
  delegatorAgentRunId: input.delegatorAgentRunId,
  startedAt: input.startedAt,
  source: input.source,
});

export const projectTaskTeamExecution = (input: {
  node: TeamRunAgentTeamNode;
  delegatorAgentRunId: string;
  startedAt: string;
  /** The snapshot the copy started from (its placement's). */
  source: TaskTeamExecutionSource;
}): TaskTeamExecution => Object.freeze({
  address: input.node.address,
  teamRunId: input.node.teamRunId,
  members: Object.freeze(input.node.children.map(member)),
  taskExecutions: Object.freeze([]),
  delegatorAgentRunId: input.delegatorAgentRunId,
  startedAt: input.startedAt,
  source: input.source,
});

/** The snapshot a delegation placement of the given kind carries (the placement kind is the prepared copy's). */
export const placementSourceOf = <TKind extends TaskExecutionSource["kind"]>(
  placement: Readonly<{ source: TaskExecutionSource }>,
  kind: TKind,
): Extract<TaskExecutionSource, { kind: TKind }> => {
  if (placement.source.kind !== kind) throw new Error(`The delegation placement is not an ${kind === "agent" ? "Agent" : "AgentTeam"} placement.`);
  return placement.source as Extract<TaskExecutionSource, { kind: TKind }>;
};
