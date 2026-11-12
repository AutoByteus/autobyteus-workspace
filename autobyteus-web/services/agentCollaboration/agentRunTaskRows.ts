import type { DelegatedChildRun } from '~/services/delegatedChildren/delegatedChildRuns'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import { treeLinesOf } from '~/utils/treeLines'
import { resolveTeamStatus, type TeamStatus } from '~/utils/workspaceTeamAggregateStatus'

export type AgentRunTaskTreeRow = Readonly<{
  row: RunHistoryTransientExecutionRow
  /** A Team row's status, counted from every listed agent under it (collapsed too); null for an agent row. */
  teamStatus: TeamStatus | null
  continuingAncestorDepths: number[]
  hasFollowingSibling: boolean
}>

const nameAt = memberDisplayName

/**
 * The task rows under an agent run's row (autobyteus-461 CR-461-025): the one builder of them, whether the run is open
 * (its view's children and their contexts' statuses) or only listed (the history poll's answer). Each child in the
 * order it was delegated: an agent row, or a team row with its members below it while expanded; a child on a peer node
 * carries its node. A row names who started it (its delegator's address, else its run ID). A child team's status is
 * its own agents', counted collapsed too: it runs on its own; a peer team's follows the run's own activity (its
 * statuses come from the run's live observation, autobyteus-278).
 */
export const agentRunTaskRows = (input: Readonly<{
  hostRunId: string
  children: readonly DelegatedChildRun[]
  statusOf(agentRunId: string): AgentStatus | string | null | undefined
  delegatorAddressOf(agentRunId: string): string | null
  isActive: boolean
  isTeamExpanded(teamRunId: string): boolean
}>): AgentRunTaskTreeRow[] => {
  const flat: { row: RunHistoryTransientExecutionRow; teamStatus: TeamStatus | null }[] = []
  const status = (agentRunId: string) => input.statusOf(agentRunId) ?? AgentStatus.Offline
  const delegatedBy = (child: DelegatedChildRun): string | null => {
    if (!child.delegatorAgentRunId) return null
    const address = input.delegatorAddressOf(child.delegatorAgentRunId)
    return address ? nameAt(address) : child.delegatorAgentRunId
  }
  for (const child of input.children) {
    const remote = child.node ? { remote: Object.freeze({ runId: child.runId, nodeName: child.node.nodeName }) } : {}
    const agentRow = (agent: Readonly<{ address: string; agentRunId: string }>, depth: number, member: boolean): RunHistoryTransientExecutionRow => ({
      kind: 'transient_execution', transientKind: member ? 'task_team_child' : 'task_agent', rowKey: `agent:${agent.agentRunId}`,
      teamRunId: input.hostRunId, memberAddress: agent.address, agentRunId: agent.agentRunId, teamRunIdForNode: null, memberKind: 'agent',
      displayName: nameAt(agent.address), currentStatus: status(agent.agentRunId), delegatedBy: member ? null : delegatedBy(child), depth,
      hasChildren: false, ...remote,
    })
    if (child.kind === 'agent') {
      flat.push({ row: agentRow({ address: child.address, agentRunId: child.runId }, 0, false), teamStatus: null })
      continue
    }
    flat.push({ row: {
      kind: 'transient_execution', transientKind: 'task_team', rowKey: `team:${child.runId}`, teamRunId: input.hostRunId,
      memberAddress: child.address, agentRunId: null, teamRunIdForNode: child.runId, memberKind: 'agent_team',
      displayName: nameAt(child.address), currentStatus: null, delegatedBy: delegatedBy(child), depth: 0,
      hasChildren: child.members.length > 0, ...remote,
    }, teamStatus: resolveTeamStatus(child.members.map((member) => status(member.agentRunId)), child.node ? input.isActive : true) })
    if (input.isTeamExpanded(child.runId)) child.members.forEach((member) => flat.push({ row: agentRow(member, 1, true), teamStatus: null }))
  }
  const lines = treeLinesOf(flat.map(({ row }) => row.depth))
  return flat.map(({ row, teamStatus }, index) => Object.freeze({ row, teamStatus, ...lines[index]! }))
}
