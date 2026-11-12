import type { ListedRunAnswer, ListedRunChild } from '~/services/listedRuns/listedRunChildrenQuery';
import { teamMemberNameAmong } from '~/services/teamExecution/teamExecutionTreeSelectors';
import { memberAddressBasename } from '~/types/agent/AgentTeamAddress';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  RunHistoryTransientExecutionRow,
} from './runHistoryTypes';

/**
 * A listed Team run's rows while it is not open (autobyteus-461 SR-055): its members, with the runs it delegated to from
 * the history poll's answer placed as its view places them. A child delegated to a member's address follows that
 * member: an agent child at the member's level, a team child under it with its members below; any other child follows
 * the members at the top level. Names, starters and statuses are the view's: the starter's address basename (else its
 * run ID), each agent's status from the answer.
 */
export const withListedChildRows = (
  teamRunId: string,
  members: readonly RunHistoryStableExecutionRow[],
  answer: ListedRunAnswer,
): RunHistoryTeamExecutionRow[] => {
  const nameOf = (address: string) => teamMemberNameAmong(members.map((member) => member.memberAddress), address);
  const statusOf = (child: ListedRunChild, agentRunId: string): AgentStatus =>
    (child.statuses.find((status) => status.agentRunId === agentRunId)?.status as AgentStatus | undefined) ?? AgentStatus.Offline;
  const delegatedBy = (child: ListedRunChild): string | null => {
    const delegator = child.row.delegatorAgentRunId;
    if (!delegator) return null;
    return child.delegatorAddress ? memberAddressBasename(child.delegatorAddress) : delegator;
  };
  const agentRow = (child: ListedRunChild, agent: Readonly<{ address: string; agentRunId: string }>, depth: number,
    member: boolean): RunHistoryTransientExecutionRow => ({
    kind: 'transient_execution', transientKind: member ? 'task_team_child' : 'task_agent', rowKey: `agent:${agent.agentRunId}`,
    teamRunId, memberAddress: agent.address, agentRunId: agent.agentRunId, teamRunIdForNode: null, memberKind: 'agent',
    displayName: nameOf(agent.address), currentStatus: statusOf(child, agent.agentRunId),
    delegatedBy: member ? null : delegatedBy(child), depth, hasChildren: false, remote: null,
  });
  const rowsOf = (child: ListedRunChild, depth: number): RunHistoryTransientExecutionRow[] => {
    const row = child.row;
    if (row.kind === 'agent') return [agentRow(child, row, depth, false)];
    return [{
      kind: 'transient_execution', transientKind: 'task_team', rowKey: `team:${row.teamRunId}`, teamRunId,
      memberAddress: row.address, agentRunId: null, teamRunIdForNode: row.teamRunId, memberKind: 'agent_team',
      displayName: nameOf(row.address), currentStatus: null, delegatedBy: delegatedBy(child), depth,
      hasChildren: row.members.length > 0, remote: null,
    }, ...row.members.map((member) => agentRow(child, member, depth + 1, true))];
  };
  const rows: RunHistoryTeamExecutionRow[] = [];
  const placed = new Set<ListedRunChild>();
  for (const member of members) {
    const under = answer.children.filter((child) => child.row.address === member.memberAddress);
    under.forEach((child) => placed.add(child));
    rows.push(under.some((child) => child.row.kind === 'agent_team') ? { ...member, hasChildren: true } : member);
    // An agent child is lifted to its member's level, as its sibling; a team child is contained by its member.
    for (const child of under) rows.push(...rowsOf(child, child.row.kind === 'agent' ? member.depth : member.depth + 1));
  }
  for (const child of answer.children) if (!placed.has(child)) rows.push(...rowsOf(child, 0));
  return rows;
};
