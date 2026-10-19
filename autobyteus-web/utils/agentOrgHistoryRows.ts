import type { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { projectAgentOrgTaskTeamStatus, projectAgentOrgTeamBranchStatus } from '~/services/agentOrgExecution/agentOrgTeamBranchStatus'
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'
import {
  isAgentOrgAgentNode,
  isAgentOrgTaskAgentNode,
  type AgentOrgTaskExecutionNode,
  type AgentOrgTaskTeamMember,
} from '~/types/collaboration/agentOrgExecution'
import { foldTeamAggregateStatus, type TeamStatus, type TeamStatusAuthority } from '~/utils/workspaceTeamAggregateStatus'
import { collaborationTreeWalk, collectClosedSubtrees, type CollaborationTreeNode } from '~/utils/collaboration/taskExecutionClosure'

export type AgentOrgHistoryAgentRow = Readonly<{
  key: string; kind: 'agent'; address: string; agentRunId: string; status: AgentStatus; depth: number
}>
export type AgentOrgHistoryTeamRow = Readonly<{
  key: string; kind: 'team'; address: string; teamRunId: string; status: TeamStatus; depth: number
}>
/**
 * Delegated rows carry who started them (REQ-013): the delegator's address when it resolves
 * in the tree, otherwise its AgentRun ID. Task-Team members carry none (the Team row does).
 */
export type AgentOrgHistoryDelegator = Readonly<{ agentRunId: string; address: string | null }>
export type AgentOrgHistoryTaskAgentRow = Readonly<{
  key: string; kind: 'task_agent'; taskKind: 'direct' | 'team_member'; address: string
  agentRunId: string; status: AgentStatus; depth: number; delegatedBy: AgentOrgHistoryDelegator | null
}>
export type AgentOrgHistoryTaskTeamRow = Readonly<{
  key: string; kind: 'task_team'; address: string; teamRunId: string; status: TeamStatus; depth: number
  coordinatorAgentRunId: string; coordinatorAddress: string
  delegatedBy: AgentOrgHistoryDelegator | null
  /** Disclosure state: descendants are emitted only while expanded. */
  hasChildren: boolean; expanded: boolean
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
/** A delegated Team copy; Teams are flat, so its members are Agents. */
type TaskTeamNode = Extract<AgentOrgTaskExecutionNode, { teamRunId: string }>
type StatusSource = Readonly<{
  authority: TeamStatusAuthority
  coordinatorFor(team: TaskTeamNode): Readonly<{ agentRunId: string; address: string }>
  statusForAgentRunId(agentRunId: string): AgentStatus | string | null | undefined
  /** Null when the child was recorded before its delegator was stored (no starter shown). */
  delegatorFor(delegatorAgentRunId: string | undefined): AgentOrgHistoryDelegator | null
  isTaskTeamExpanded(teamRunId: string): boolean
  /** False for a closed task execution (Task DONE) and everything under it. */
  isListed(node: TaskBranchNode): boolean
}>

/** Root-level delegated children as the tree shows them. */
const rootTaskExecutions = (rootOrg: AgentOrgRunHistoryItem['executionTree']['rootOrg']): readonly AgentOrgTaskExecutionNode[] =>
  rootOrg.taskExecutions

const collectAgentAddresses = (tree: AgentOrgRunHistoryItem['executionTree']): ReadonlyMap<string, string> => {
  const addresses = new Map<string, string>()
  const visitTasks = (tasks: readonly AgentOrgTaskExecutionNode[]) => {
    for (const task of tasks) {
      if ('agentRunId' in task) addresses.set(task.agentRunId, task.address)
      else {
        task.members.forEach((member) => addresses.set(member.agentRunId, member.address))
        visitTasks(task.taskExecutions)
      }
    }
  }
  for (const member of tree.rootOrg.members) {
    if ('agentRunId' in member) addresses.set(member.agentRunId, member.address)
    else {
      member.members.forEach((agent) => addresses.set(agent.agentRunId, agent.address))
      visitTasks(member.taskExecutions)
    }
  }
  visitTasks(rootTaskExecutions(tree.rootOrg))
  return addresses
}

const statusSource = (
  run: AgentOrgRunHistoryItem,
  context: AgentOrgExecutionContext | null,
  isTaskTeamExpanded: (teamRunId: string) => boolean,
): StatusSource => {
  const live = Boolean(
    run.isActive
    && context?.orgRunId === run.rootRunId
    && context.executionTree.rootOrg.orgRunId === run.rootRunId
    && context.isActive
    && context.phase === 'live',
  )
  const tree = context?.executionTree ?? run.executionTree
  const addresses = collectAgentAddresses(tree)
  // The closure facts belong to the tree being shown: the context's, else the history item's.
  const hidden = collectClosedSubtrees<CollaborationTreeNode>([...tree.rootOrg.members, ...rootTaskExecutions(tree.rootOrg)],
    context ? context.view.closed_task_executions : run.closedTaskExecutions, collaborationTreeWalk)
  return {
    authority: live ? 'live' : 'historical',
    isTaskTeamExpanded,
    isListed: (node) => !hidden.has(collaborationTreeWalk.keyOf(node)),
    delegatorFor: (delegatorAgentRunId) => delegatorAgentRunId === undefined ? null : Object.freeze({
      agentRunId: delegatorAgentRunId,
      address: addresses.get(delegatorAgentRunId) ?? null,
    }),
    coordinatorFor: (team) => {
      // A Team copy names its coordinator in its own source.
      const matches = team.members.filter((member) => member.address === team.source.coordinatorAddress)
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

/** The Team status inputs: the Org run is alive only while its statuses are live. */
const teamStatusInput = <TTeam>(source: StatusSource, team: TTeam) => ({
  team,
  runAlive: source.authority === 'live',
  isListed: source.isListed,
  statusForAgentRunId: source.statusForAgentRunId,
})

const flattenTaskTeam = (team: TaskTeamNode, depth: number, source: StatusSource): AgentOrgHistoryRow[] => {
  const coordinator = source.coordinatorFor(team)
  const members = team.members.filter((member) => source.isListed(member))
  const tasks = team.taskExecutions.filter((task) => source.isListed(task))
  const hasChildren = members.length > 0 || tasks.length > 0
  const expanded = source.isTaskTeamExpanded(team.teamRunId)
  const rows: AgentOrgHistoryRow[] = [{
    key: `task-team:${team.teamRunId}`,
    kind: 'task_team',
    address: team.address,
    teamRunId: team.teamRunId,
    status: projectAgentOrgTaskTeamStatus(teamStatusInput(source, team)),
    coordinatorAgentRunId: coordinator.agentRunId, coordinatorAddress: coordinator.address,
    depth,
    delegatedBy: source.delegatorFor(team.delegatorAgentRunId),
    hasChildren,
    expanded,
  }]
  if (hasChildren && !expanded) return rows
  for (const member of members) {
    rows.push({
      key: `task-team-agent:${member.agentRunId}`,
      kind: 'task_agent',
      taskKind: 'team_member',
      address: member.address,
      agentRunId: member.agentRunId,
      status: exactAgentStatus(source, member.agentRunId),
      depth: depth + 1,
      delegatedBy: null,
    })
  }
  for (const task of tasks) rows.push(...flattenTask(task, depth + 1, source))
  return rows
}

const flattenTask = (
  task: AgentOrgTaskExecutionNode,
  depth: number,
  source: StatusSource,
): AgentOrgHistoryRow[] => !source.isListed(task) ? [] : isAgentOrgTaskAgentNode(task)
  ? [{
      key: `task-agent:${task.agentRunId}`,
      kind: 'task_agent',
      taskKind: 'direct',
      address: task.address,
      agentRunId: task.agentRunId,
      status: exactAgentStatus(source, task.agentRunId),
      depth,
      delegatedBy: source.delegatorFor(task.delegatorAgentRunId),
    }]
  : flattenTaskTeam(task, depth, source)

export const projectAgentOrgHistoryRows = (input: Readonly<{
  run: AgentOrgRunHistoryItem
  context: AgentOrgExecutionContext | null
  isTeamExpanded(address: string): boolean
  /** Delegated Teams start expanded; omit to show every delegated Team open. */
  isTaskTeamExpanded?(teamRunId: string): boolean
}>): AgentOrgHistoryDisplayRow[] => {
  const tree = input.context?.executionTree ?? input.run.executionTree
  const source = statusSource(input.run, input.context, input.isTaskTeamExpanded ?? (() => true))
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
      status: projectAgentOrgTeamBranchStatus(teamStatusInput(source, member)),
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
  for (const task of rootTaskExecutions(tree.rootOrg)) rows.push(...flattenTask(task, 0, source))

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
