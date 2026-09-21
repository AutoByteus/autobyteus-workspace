import type { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { projectAgentOrgTeamBranchStatus } from '~/services/agentOrgExecution/agentOrgTeamBranchStatus'
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'
import {
  isAgentOrgAgentNode,
  isAgentOrgTaskAgentNode,
  type AgentOrgTaskExecutionNode,
  type AgentOrgTaskTeamMember,
} from '~/types/collaboration/agentOrgExecution'
import { foldTeamAggregateStatus, type TeamStatusAuthority } from '~/utils/workspaceTeamAggregateStatus'

export type AgentOrgHistoryAgentRow = Readonly<{
  key: string; kind: 'agent'; address: string; agentRunId: string; status: AgentStatus; depth: number
}>
export type AgentOrgHistoryTeamRow = Readonly<{
  key: string; kind: 'team'; address: string; teamRunId: string; status: AgentStatus; depth: number
}>
export type AgentOrgHistoryTaskAgentRow = Readonly<{
  key: string; kind: 'task_agent'; taskKind: 'direct' | 'team_member'; address: string
  agentRunId: string; status: AgentStatus; depth: number
}>
export type AgentOrgHistoryTaskTeamRow = Readonly<{
  key: string; kind: 'task_team'; address: string; teamRunId: string; depth: number; coordinatorAgentRunId: string; coordinatorAddress: string
}>
export type AgentOrgHistoryRow =
  | AgentOrgHistoryAgentRow
  | AgentOrgHistoryTeamRow
  | AgentOrgHistoryTaskAgentRow
  | AgentOrgHistoryTaskTeamRow
export type AgentOrgHistoryDisplayRow = Readonly<{
  row: AgentOrgHistoryRow
  continuingAncestorDepths: readonly number[]
  hasFollowingSibling: boolean
}>

type TaskBranchNode = AgentOrgTaskExecutionNode | AgentOrgTaskTeamMember
type TaskTeamNode = Exclude<TaskBranchNode, { agentRunId: string }>
type StatusSource = Readonly<{
  authority: TeamStatusAuthority
  coordinatorFor(team: TaskTeamNode): Readonly<{ agentRunId: string; address: string }>
  statusForAgentRunId(agentRunId: string): AgentStatus | string | null | undefined
}>

const statusSource = (
  run: AgentOrgRunHistoryItem,
  context: AgentOrgExecutionContext | null,
): StatusSource => {
  const live = Boolean(
    run.isActive
    && context?.orgRunId === run.rootRunId
    && context.executionTree.rootOrg.orgRunId === run.rootRunId
    && context.isActive
    && context.phase === 'live',
  )
  return {
    authority: live ? 'live' : 'historical',
    coordinatorFor: (team) => {
      const source = (context?.executionTree ?? run.executionTree).rootOrg.members.find((member) =>
        'teamRunId' in member && member.address === team.address)
      if (!source || !('teamRunId' in source)) throw new Error(`Missing captured Team source '${team.address}'.`)
      const findMembers = (node: TaskTeamNode): { agentRunId: string; address: string }[] => node.members.flatMap((member) =>
        'agentRunId' in member ? [member] : findMembers(member))
      const matches = findMembers(team).filter((member) => member.address === source.coordinatorAddress)
      if (matches.length !== 1) throw new Error(`Missing exact task coordinator '${team.teamRunId}'.`)
      return matches[0]!
    },
    statusForAgentRunId: (agentRunId) => live
      ? context?.getAgentContext(agentRunId)?.state.currentStatus
      : undefined,
  }
}

const exactAgentStatus = (source: StatusSource, agentRunId: string): AgentStatus =>
  foldTeamAggregateStatus([source.statusForAgentRunId(agentRunId)], source.authority)

const flattenTaskTeam = (team: TaskTeamNode, depth: number, source: StatusSource): AgentOrgHistoryRow[] => {
  const coordinator = source.coordinatorFor(team)
  const rows: AgentOrgHistoryRow[] = [{
    key: `task-team:${team.teamRunId}`,
    kind: 'task_team',
    address: team.address,
    teamRunId: team.teamRunId,
    coordinatorAgentRunId: coordinator.agentRunId, coordinatorAddress: coordinator.address,
    depth,
  }]
  for (const member of team.members) {
    if (isAgentOrgTaskAgentNode(member)) {
      rows.push({
        key: `task-team-agent:${member.agentRunId}`,
        kind: 'task_agent',
        taskKind: 'team_member',
        address: member.address,
        agentRunId: member.agentRunId,
        status: exactAgentStatus(source, member.agentRunId),
        depth: depth + 1,
      })
    } else rows.push(...flattenTaskTeam(member, depth + 1, source))
  }
  for (const task of team.taskExecutions) rows.push(...flattenTask(task, depth + 1, source))
  return rows
}

const flattenTask = (
  task: AgentOrgTaskExecutionNode,
  depth: number,
  source: StatusSource,
): AgentOrgHistoryRow[] => task.settledAt !== null ? [] : isAgentOrgTaskAgentNode(task)
  ? [{
      key: `task-agent:${task.agentRunId}`,
      kind: 'task_agent',
      taskKind: 'direct',
      address: task.address,
      agentRunId: task.agentRunId,
      status: exactAgentStatus(source, task.agentRunId),
      depth,
    }]
  : flattenTaskTeam(task, depth, source)

export const projectAgentOrgHistoryRows = (input: Readonly<{
  run: AgentOrgRunHistoryItem
  context: AgentOrgExecutionContext | null
  isTeamExpanded(address: string): boolean
}>): AgentOrgHistoryDisplayRow[] => {
  const tree = input.context?.executionTree ?? input.run.executionTree
  const source = statusSource(input.run, input.context)
  const rows: AgentOrgHistoryRow[] = []
  for (const member of tree.rootOrg.members) {
    if (isAgentOrgAgentNode(member)) {
      rows.push({
        key: `agent:${member.agentRunId}`,
        kind: 'agent',
        address: member.address,
        agentRunId: member.agentRunId,
        status: exactAgentStatus(source, member.agentRunId),
        depth: 0,
      })
      continue
    }
    rows.push({
      key: `team:${member.teamRunId}`,
      kind: 'team',
      address: member.address,
      teamRunId: member.teamRunId,
      status: projectAgentOrgTeamBranchStatus({ team: member, ...source }),
      depth: 0,
    })
    if (!input.isTeamExpanded(member.address)) continue
    rows.push(...member.members.map((agent) => ({
      key: `agent:${agent.agentRunId}`,
      kind: 'agent' as const,
      address: agent.address,
      agentRunId: agent.agentRunId,
      status: exactAgentStatus(source, agent.agentRunId),
      depth: 1,
    })))
    for (const task of member.taskExecutions) rows.push(...flattenTask(task, 1, source))
  }
  for (const task of tree.rootOrg.taskExecutions) rows.push(...flattenTask(task, 0, source))

  const hasSibling = (index: number, depth: number): boolean => {
    for (let next = index + 1; next < rows.length; next += 1) {
      if (rows[next]!.depth < depth) return false
      if (rows[next]!.depth === depth) return true
    }
    return false
  }
  return rows.map((row, index) => ({
    row,
    continuingAncestorDepths: Array.from({ length: row.depth }, (_, depth) => depth)
      .filter((depth) => hasSibling(index, depth)),
    hasFollowingSibling: hasSibling(index, row.depth),
  }))
}
