import type { ListedRunAnswer, ListedRunChild } from '~/services/listedRuns/listedRunChildrenQuery'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import { treeLinesOf } from '~/utils/treeLines'
import { resolveTeamStatus, type TeamStatus } from '~/utils/workspaceTeamAggregateStatus'
import type { AgentRunTaskTreeRow } from './agentRunCollaborationContext'

const nameAt = memberDisplayName

/** A child's agent's status from the answer; `offline` when it names none. */
const statusIn = (child: ListedRunChild, agentRunId: string): AgentStatus =>
  (child.statuses.find((status) => status.agentRunId === agentRunId)?.status as AgentStatus | undefined) ?? AgentStatus.Offline

/** Who started a child, as the view names it: its delegator's address, else its run ID; none when it has no delegator. */
const delegatorNameOf = (child: ListedRunChild): string | null => {
  const delegator = child.row.delegatorAgentRunId
  if (!delegator) return null
  return child.delegatorAddress ? nameAt(child.delegatorAddress) : delegator
}

/**
 * The task rows under a listed standalone run that is not open, from the history poll's answer (autobyteus-461 SR-055):
 * the rows its view lists (`AgentRunCollaborationContext.listTaskRows`) for its local children, in the answer's order,
 * each with its agents' statuses. A task Team's members are shown while it is expanded; its status counts them either way.
 */
export const listedAgentRunTaskRows = (
  hostRunId: string,
  answer: ListedRunAnswer,
  isTeamExpanded: (teamRunId: string) => boolean,
): AgentRunTaskTreeRow[] => {
  const flat: { row: RunHistoryTransientExecutionRow; teamStatus: TeamStatus | null }[] = []
  const agentRow = (child: ListedRunChild, agent: Readonly<{ address: string; agentRunId: string }>, depth: number,
    member: boolean): RunHistoryTransientExecutionRow => ({
    kind: 'transient_execution', transientKind: member ? 'task_team_child' : 'task_agent',
    rowKey: `agent:${agent.agentRunId}`, teamRunId: hostRunId, memberAddress: agent.address,
    agentRunId: agent.agentRunId, teamRunIdForNode: null, memberKind: 'agent', displayName: nameAt(agent.address),
    currentStatus: statusIn(child, agent.agentRunId), delegatedBy: member ? null : delegatorNameOf(child), depth, hasChildren: false,
  })
  for (const child of answer.children) {
    const row = child.row
    if (row.kind === 'agent') {
      flat.push({ row: agentRow(child, row, 0, false), teamStatus: null })
      continue
    }
    flat.push({ row: {
      kind: 'transient_execution', transientKind: 'task_team', rowKey: `team:${row.teamRunId}`, teamRunId: hostRunId,
      memberAddress: row.address, agentRunId: null, teamRunIdForNode: row.teamRunId, memberKind: 'agent_team',
      displayName: nameAt(row.address), currentStatus: null, delegatedBy: delegatorNameOf(child), depth: 0,
      hasChildren: row.members.length > 0,
    // A child Team's status is its own agents': it runs on its own, whether or not this run's agent does.
    }, teamStatus: resolveTeamStatus(row.members.map((member) => statusIn(child, member.agentRunId)), true) })
    if (isTeamExpanded(row.teamRunId)) row.members.forEach((member) => flat.push({ row: agentRow(child, member, 1, true), teamStatus: null }))
  }
  const lines = treeLinesOf(flat.map(({ row }) => row.depth))
  return flat.map(({ row, teamStatus }, index) => Object.freeze({ row, teamStatus, ...lines[index]! }))
}
