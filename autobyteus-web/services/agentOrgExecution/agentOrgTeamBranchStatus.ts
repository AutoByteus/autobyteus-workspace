import type { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  AgentOrgConfiguredTeamNode,
  AgentOrgTaskExecutionNode,
  AgentOrgTaskTeamMember,
} from '~/types/collaboration/agentOrgExecution';
import { resolveTeamStatus, type TeamStatus } from '~/utils/workspaceTeamAggregateStatus';

type AgentOrgTaskBranchNode = AgentOrgTaskExecutionNode | AgentOrgTaskTeamMember;
type AgentOrgTaskTeamNode = Exclude<AgentOrgTaskBranchNode, { agentRunId: string }>;

type AgentOrgTeamStatusInput<TTeam> = Readonly<{
  team: TTeam;
  /** The Org run is live; a stopped Org's Teams are offline. */
  runAlive: boolean;
  /** False for a closed task execution (Task DONE) and everything under it. */
  isListed(node: AgentOrgTaskBranchNode): boolean;
  statusForAgentRunId(agentRunId: string): AgentStatus | string | null | undefined;
}>;

/** The AgentRun IDs of the listed agents in a task branch (members, nested Teams and their delegated work). */
const appendListedTaskAgentRunIds = (
  node: AgentOrgTaskBranchNode,
  isListed: (node: AgentOrgTaskBranchNode) => boolean,
  runIds: string[],
): void => {
  if (!isListed(node)) return;
  if ('agentRunId' in node) {
    runIds.push(node.agentRunId);
    return;
  }
  for (const member of node.members) appendListedTaskAgentRunIds(member, isListed, runIds);
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

/** A delegated Team (or a Team nested in one) under an Org run: the listed agents in its subtree. */
export const projectAgentOrgTaskTeamStatus = (
  input: AgentOrgTeamStatusInput<AgentOrgTaskTeamNode>,
): TeamStatus => {
  const agentRunIds: string[] = [];
  appendListedTaskAgentRunIds(input.team, input.isListed, agentRunIds);
  return resolveStatus(agentRunIds, input);
};
