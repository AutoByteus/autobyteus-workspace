import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ListedRunAnswer } from '~/services/listedRuns/listedRunChildrenQuery';
import { teamRunHistoryRows } from './runHistoryTeamChildRows';
import { childOfRemoteExecution, childOfTeamTask, inDelegationOrder, listedRunChildren } from '~/services/delegatedChildren/delegatedChildRuns';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  TeamMemberTreeRow,
  TeamTreeNode,
} from './runHistoryTypes';

const stableRowKey = (row: TeamMemberTreeRow): string => row.kind === 'agent'
  ? `agent:${row.agentRunId}`
  : `team:${row.teamRunIdForNode}`;

const flattenStableRows = (
  rows: readonly TeamMemberTreeRow[],
  depth = 0,
): RunHistoryStableExecutionRow[] => rows.flatMap((row) => [{
  kind: 'stable_member' as const,
  rowKey: stableRowKey(row),
  teamRunId: row.teamRunId,
  memberAddress: row.memberAddress,
  agentRunId: row.agentRunId ?? null,
  teamRunIdForNode: row.teamRunIdForNode ?? null,
  memberKind: row.kind,
  displayName: row.displayName || row.memberAddress,
  depth,
  hasChildren: row.children.length > 0,
  row,
}, ...flattenStableRows(row.children, depth + 1)]);

/**
 * A Team run's history rows: its members with the runs it delegated to, by the one builder (autobyteus-461 CR-461-025),
 * from the open run's view, else from the history poll's answer (`listed`, SR-055), or its members alone before the
 * first answer.
 */
export const buildRunHistoryTeamExecutionRows = (
  team: TeamTreeNode,
  context: AgentTeamContext | null,
  listed: ListedRunAnswer | null,
): RunHistoryTeamExecutionRow[] => {
  const stableSource = team.rootTeam.children.length > 0 ? team.rootTeam.children : team.members;
  const members = flattenStableRows(stableSource);
  if (context) {
    const rootTeamRunId = context.view.getRootTeamRunId();
    if (team.teamRunId !== rootTeamRunId) {
      throw new Error(`Team history root '${team.teamRunId}' does not match execution root '${rootTeamRunId}'.`);
    }
    // The view's child rows are the open ones (autobyteus-461), here and on peer nodes.
    return teamRunHistoryRows({ teamRunId: rootTeamRunId, members,
      children: inDelegationOrder([...context.view.getExecutionTree().root_team.task_executions.map(childOfTeamTask),
        ...context.view.listRemoteExecutions().map(childOfRemoteExecution)]),
      statusOf: (agentRunId) => context.view.getAgentContext(agentRunId)?.state.currentStatus,
      delegatorAddressOf: (agentRunId) => context.view.getMemberAddress(agentRunId) });
  }
  if (!listed) return members;
  const answer = listedRunChildren(listed);
  return teamRunHistoryRows({ teamRunId: team.teamRunId, members, children: answer.children, statusOf: answer.statusOf,
    delegatorAddressOf: answer.delegatorAddressOf });
};
