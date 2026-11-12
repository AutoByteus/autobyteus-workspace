import type { DelegatedChildRun } from '~/services/delegatedChildren/delegatedChildRuns'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import type { AgentStatus } from '~/types/agent/AgentStatus'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import { foldTeamAggregateStatus, resolveTeamStatus, type TeamStatus, type TeamStatusAuthority } from '~/utils/workspaceTeamAggregateStatus'
import type { AgentOrgHistoryDelegator, AgentOrgHistoryRow } from '~/utils/agentOrgHistoryRows'

/**
 * An Org run's delegated rows (autobyteus-461 CR-461-025): the one builder of them, whether the run is open (its view's
 * children and statuses) or only listed (the history poll's answer). Each child at the Org's top level, in the order it
 * was delegated:
 * - on this node: an agent row, or a team row (opening its coordinator) with its members below it while expanded;
 * - on a peer node: the shared delegated row with its node (autobyteus-278), a team row with its members while expanded.
 * A row names who started it (its delegator, with its address when known). Statuses are the given ones, folded by the
 * given authority; a team's status is its agents', alive as given for a child here and for one on a peer node.
 */
export const agentOrgChildRows = (input: Readonly<{
  /** The rows' run (a delegated row's `teamRunId`). */
  rootRunId: string
  children: readonly DelegatedChildRun[]
  statusOf(agentRunId: string): AgentStatus | string | null | undefined
  authority: TeamStatusAuthority
  teamsAlive: Readonly<{ local: boolean; peer: boolean }>
  delegatorAddressOf(agentRunId: string): string | null
  isTaskTeamExpanded(teamRunId: string): boolean
}>): AgentOrgHistoryRow[] => {
  const status = (agentRunId: string): AgentStatus => foldTeamAggregateStatus([input.statusOf(agentRunId)], input.authority)
  const delegatorOf = (child: DelegatedChildRun): AgentOrgHistoryDelegator | null => child.delegatorAgentRunId === null ? null
    : Object.freeze({ agentRunId: child.delegatorAgentRunId, address: input.delegatorAddressOf(child.delegatorAgentRunId) })
  const coordinatorOf = (child: DelegatedChildRun) => {
    const coordinator = child.members.find((member) => member.agentRunId === child.coordinatorAgentRunId)
    if (!coordinator) throw new Error(`Missing exact task coordinator '${child.runId}'.`)
    return coordinator
  }
  const rows: AgentOrgHistoryRow[] = []
  for (const child of input.children) {
    if (child.node) {
      rows.push(...peerRows(child, input, status, delegatorOf(child)))
      continue
    }
    if (child.kind === 'agent') {
      rows.push({ key: `task-agent:${child.runId}`, kind: 'task_agent', taskKind: 'direct', address: child.address, agentRunId: child.runId,
        status: status(child.runId), depth: 0, delegatedBy: delegatorOf(child) })
      continue
    }
    const coordinator = coordinatorOf(child)
    const hasChildren = child.members.length > 0
    const expanded = input.isTaskTeamExpanded(child.runId)
    rows.push({ key: `task-team:${child.runId}`, kind: 'task_team', address: child.address, teamRunId: child.runId,
      status: resolveTeamStatus(child.members.map((member) => input.statusOf(member.agentRunId)), input.teamsAlive.local),
      coordinatorAgentRunId: coordinator.agentRunId, coordinatorAddress: coordinator.address, depth: 0, delegatedBy: delegatorOf(child),
      hasChildren, expanded })
    if (hasChildren && !expanded) continue
    rows.push(...child.members.map((member): AgentOrgHistoryRow => ({ key: `task-team-agent:${member.agentRunId}`, kind: 'task_agent',
      taskKind: 'team_member', address: member.address, agentRunId: member.agentRunId, status: status(member.agentRunId), depth: 1,
      delegatedBy: null })))
  }
  return rows
}

/** A child on a peer node as the shared delegated rows (autobyteus-278): a team row opens its coordinator. */
const peerRows = (
  child: DelegatedChildRun,
  input: Parameters<typeof agentOrgChildRows>[0],
  status: (agentRunId: string) => AgentStatus,
  delegator: AgentOrgHistoryDelegator | null,
): AgentOrgHistoryRow[] => {
  const remote = Object.freeze({ runId: child.runId, nodeName: child.node!.nodeName })
  const delegatedBy = delegator ? (delegator.address ? memberDisplayName(delegator.address) : delegator.agentRunId) : null
  const agentRow = (agent: Readonly<{ address: string; agentRunId: string }>, depth: number, member: boolean): RunHistoryTransientExecutionRow => ({
    kind: 'transient_execution', transientKind: member ? 'task_team_child' : 'task_agent', rowKey: `agent:${agent.agentRunId}`,
    teamRunId: input.rootRunId, memberAddress: agent.address, agentRunId: agent.agentRunId, teamRunIdForNode: null, memberKind: 'agent',
    displayName: memberDisplayName(agent.address), currentStatus: status(agent.agentRunId), delegatedBy: member ? null : delegatedBy, depth,
    hasChildren: false, remote,
  })
  const asRow = (transient: RunHistoryTransientExecutionRow, teamStatus: TeamStatus | null,
    open: Readonly<{ address: string; agentRunId: string }>): AgentOrgHistoryRow => Object.freeze({
    key: transient.rowKey, kind: 'remote', depth: transient.depth, transient, teamStatus, openAgentRunId: open.agentRunId, openAddress: open.address })
  if (child.kind === 'agent') {
    const agent = { address: child.address, agentRunId: child.runId }
    return [asRow(agentRow(agent, 0, false), null, agent)]
  }
  const coordinator = child.members.find((member) => member.agentRunId === child.coordinatorAgentRunId) ?? { address: child.address, agentRunId: '' }
  const team: RunHistoryTransientExecutionRow = {
    kind: 'transient_execution', transientKind: 'task_team', rowKey: `team:${child.runId}`, teamRunId: input.rootRunId,
    memberAddress: child.address, agentRunId: null, teamRunIdForNode: child.runId, memberKind: 'agent_team',
    displayName: memberDisplayName(child.address), currentStatus: null, delegatedBy, depth: 0, hasChildren: child.members.length > 0, remote,
  }
  const teamStatus = resolveTeamStatus(child.members.map((member) => status(member.agentRunId)), input.teamsAlive.peer)
  return [asRow(team, teamStatus, coordinator),
    ...(input.isTaskTeamExpanded(child.runId) ? child.members.map((member) => asRow(agentRow(member, 1, true), null, member)) : [])]
}
