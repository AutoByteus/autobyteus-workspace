import type { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  AgentOrgConfiguredTeamNode,
  AgentOrgTaskExecutionNode,
} from '~/types/collaboration/agentOrgExecution';
import { resolveTeamStatus, type TeamStatus } from '~/utils/workspaceTeamAggregateStatus';

type AgentOrgTaskTeamNode = Extract<AgentOrgTaskExecutionNode, { teamRunId: string }>;

type AgentOrgTeamStatusInput<TTeam> = Readonly<{
  team: TTeam;
  /** The Org run is live; a stopped Org's Teams are offline. */
  runAlive: boolean;
  statusForAgentRunId(agentRunId: string): AgentStatus | string | null | undefined;
}>;

/** The AgentRun IDs of the agents in a task branch: a task Agent, or a task Team's members and its delegated work. */
const appendTaskAgentRunIds = (node: AgentOrgTaskExecutionNode, runIds: string[]): void => {
  if ('agentRunId' in node) {
    runIds.push(node.agentRunId);
    return;
  }
  for (const member of node.members) runIds.push(member.agentRunId);
  for (const task of node.taskExecutions) appendTaskAgentRunIds(task, runIds);
};

const resolveStatus = (
  agentRunIds: readonly string[],
  input: AgentOrgTeamStatusInput<unknown>,
): TeamStatus => resolveTeamStatus(
  agentRunIds.map((agentRunId) => input.statusForAgentRunId(agentRunId)),
  input.runAlive,
);

/** An Org-internal (configured) Team: its members and the work delegated under it. */
export const projectAgentOrgTeamBranchStatus = (
  input: AgentOrgTeamStatusInput<AgentOrgConfiguredTeamNode>,
): TeamStatus => {
  const agentRunIds = input.team.members.map((member) => member.agentRunId);
  for (const task of input.team.taskExecutions) appendTaskAgentRunIds(task, agentRunIds);
  return resolveStatus(agentRunIds, input);
};

/** A delegated Team under an Org run (also one delegated inside another): the agents in its subtree. */
export const projectAgentOrgTaskTeamStatus = (
  input: AgentOrgTeamStatusInput<AgentOrgTaskTeamNode>,
): TeamStatus => {
  const agentRunIds: string[] = [];
  appendTaskAgentRunIds(input.team, agentRunIds);
  return resolveStatus(agentRunIds, input);
};
