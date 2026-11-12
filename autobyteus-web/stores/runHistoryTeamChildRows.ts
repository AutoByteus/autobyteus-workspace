import type { DelegatedChildRun } from '~/services/delegatedChildren/delegatedChildRuns';
import { teamMemberNameAmong } from '~/services/teamExecution/teamExecutionTreeSelectors';
import { memberAddressBasename } from '~/types/agent/AgentTeamAddress';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  RunHistoryTransientExecutionRow,
} from './runHistoryTypes';

/**
 * A Team run's history rows (autobyteus-461 CR-461-025): the one builder of its members with the runs it delegated to,
 * whether the run is open (its view's children and their contexts' statuses) or only listed (the history poll's
 * answer). A child on this node delegated to a member's address follows that member: an agent child at the member's
 * level, a team child under it with its members below; any other child, and every child on a peer node (marked with
 * its node), follows the members, in the order they were delegated. A row names who started it (its delegator's address
 * basename, else its run ID); a child on this node is named as the team names an address, one on a peer node by its
 * address.
 */
export const teamRunHistoryRows = (input: Readonly<{
  teamRunId: string;
  members: readonly RunHistoryStableExecutionRow[];
  children: readonly DelegatedChildRun[];
  statusOf(agentRunId: string): AgentStatus | string | null | undefined;
  delegatorAddressOf(agentRunId: string): string | null;
}>): RunHistoryTeamExecutionRow[] => {
  const memberAddresses = input.members.map((member) => member.memberAddress);
  const nameOf = (child: DelegatedChildRun, address: string) => child.node ? memberDisplayName(address) : teamMemberNameAmong(memberAddresses, address);
  const delegatedBy = (child: DelegatedChildRun): string | null => {
    if (!child.delegatorAgentRunId) return null;
    const address = input.delegatorAddressOf(child.delegatorAgentRunId);
    return address ? memberAddressBasename(address) : child.delegatorAgentRunId;
  };
  const rowsOf = (child: DelegatedChildRun, depth: number): RunHistoryTransientExecutionRow[] => {
    const remote = child.node ? Object.freeze({ runId: child.runId, nodeName: child.node.nodeName }) : null;
    const agentRow = (agent: Readonly<{ address: string; agentRunId: string }>, agentDepth: number, member: boolean): RunHistoryTransientExecutionRow => ({
      kind: 'transient_execution', transientKind: member ? 'task_team_child' : 'task_agent', rowKey: `agent:${agent.agentRunId}`,
      teamRunId: input.teamRunId, memberAddress: agent.address, agentRunId: agent.agentRunId, teamRunIdForNode: null, memberKind: 'agent',
      displayName: nameOf(child, agent.address), currentStatus: input.statusOf(agent.agentRunId) ?? AgentStatus.Offline,
      delegatedBy: member ? null : delegatedBy(child), depth: agentDepth, hasChildren: false, remote,
    });
    if (child.kind === 'agent') return [agentRow({ address: child.address, agentRunId: child.runId }, depth, false)];
    return [{
      kind: 'transient_execution', transientKind: 'task_team', rowKey: `team:${child.runId}`, teamRunId: input.teamRunId,
      memberAddress: child.address, agentRunId: null, teamRunIdForNode: child.runId, memberKind: 'agent_team',
      displayName: nameOf(child, child.address), currentStatus: null, delegatedBy: delegatedBy(child), depth,
      hasChildren: child.members.length > 0, remote,
    }, ...child.members.map((member) => agentRow(member, depth + 1, true))];
  };
  const rows: RunHistoryTeamExecutionRow[] = [];
  const placed = new Set<DelegatedChildRun>();
  for (const member of input.members) {
    const under = input.children.filter((child) => !child.node && child.address === member.memberAddress);
    under.forEach((child) => placed.add(child));
    rows.push(under.some((child) => child.kind === 'agent_team') ? { ...member, hasChildren: true } : member);
    // An agent child is lifted to its member's level, as its sibling; a team child is contained by its member.
    for (const child of under) rows.push(...rowsOf(child, child.kind === 'agent' ? member.depth : member.depth + 1));
  }
  for (const child of input.children) if (!placed.has(child)) rows.push(...rowsOf(child, 0));
  return rows;
};
