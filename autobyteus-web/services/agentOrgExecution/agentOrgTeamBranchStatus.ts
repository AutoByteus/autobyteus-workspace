import type { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  AgentOrgConfiguredTeamNode,
  AgentOrgTaskExecutionNode,
  AgentOrgTaskTeamMember,
} from '~/types/collaboration/agentOrgExecution';
import { resolveTeamStatus, type TeamStatus } from '~/utils/workspaceTeamAggregateStatus';

/** A task branch node: a delegated child, or an Agent member of a delegated Team (Teams are flat). */
type AgentOrgTaskBranchNode = AgentOrgTaskExecutionNode | AgentOrgTaskTeamMember;
type AgentOrgTaskTeamNode = Extract<AgentOrgTaskExecutionNode, { teamRunId: string }>;

type AgentOrgTeamStatusInput<TTeam> = Readonly<{
  team: TTeam;
  /** The Org run is live; a stopped Org's Teams are offline. */
  runAlive: boolean;
  /** False for a closed task execution (Task DONE) and everything under it. */
  isListed(node: AgentOrgTaskBranchNode): boolean;
  statusForAgentRunId(agentRunId: string): AgentStatus | string | null | undefined;
}>;

/** The AgentRun IDs of the listed agents in a task branch: a task Agent, or a task Team's members and its delegated work. */
const appendListedTaskAgentRunIds = (
  node: AgentOrgTaskExecutionNode,
  isListed: (node: AgentOrgTaskBranchNode) => boolean,
  runIds: string[],
): void => {
  if (!isListed(node)) return;
  if ('agentRunId' in node) {
    runIds.push(node.agentRunId);
    return;
  }
  for (const member of node.members) if (isListed(member)) runIds.push(member.agentRunId);
  for (const task of node.taskExecutions) appendListedTaskAgentRunIds(task, isListed, runIds);
};

const resolveStatus = (
  agentRunIds: readonly string[],
  input: AgentOrgTeamStatusInput<unknown>,
): TeamStatus => resolveTeamStatus(
  agentRunIds.map((agentRunId) => input.statusForAgentRunId(agentRunId)),
  input.runAlive,
);

/** An Org-internal (configured) Team: its members and the listed work delegated under it. */
export const projectAgentOrgTeamBranchStatus = (
  input: AgentOrgTeamStatusInput<AgentOrgConfiguredTeamNode>,
): TeamStatus => {
  const agentRunIds = input.team.members.map((member) => member.agentRunId);
  for (const task of input.team.taskExecutions) appendListedTaskAgentRunIds(task, input.isListed, agentRunIds);
  return resolveStatus(agentRunIds, input);
};

/** A delegated Team under an Org run (also one delegated inside another): the listed agents in its subtree. */
export const projectAgentOrgTaskTeamStatus = (
  input: AgentOrgTeamStatusInput<AgentOrgTaskTeamNode>,
): TeamStatus => {
  const agentRunIds: string[] = [];
  appendListedTaskAgentRunIds(input.team, input.isListed, agentRunIds);
  return resolveStatus(agentRunIds, input);
};
