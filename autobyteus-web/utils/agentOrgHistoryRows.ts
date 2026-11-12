import type { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { projectAgentOrgTeamBranchStatus } from '~/services/agentOrgExecution/agentOrgTeamBranchStatus'
import { childOfCollaborationTask, childOfRemoteExecution, inDelegationOrder, listedRunChildren } from '~/services/delegatedChildren/delegatedChildRuns'
import type { ListedRunAnswer } from '~/services/listedRuns/listedRunChildrenQuery'
import type { AgentOrgRunHistoryItem, RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import type { AgentStatus } from '~/types/agent/AgentStatus'
import { isAgentOrgAgentNode, type AgentOrgTaskExecutionNode } from '~/types/collaboration/agentOrgExecution'
import { agentOrgChildRows } from '~/utils/agentOrgChildRows'
import { treeLinesOf } from '~/utils/treeLines'
import { foldTeamAggregateStatus, type TeamStatus, type TeamStatusAuthority } from '~/utils/workspaceTeamAggregateStatus'

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
/**
 * autobyteus-278: a row of a run this Org delegated to another node, drawn by the shared delegated row (node chip,
 * title, reachability, Retry). A Team row opens its coordinator.
 */
export type AgentOrgHistoryRemoteRow = Readonly<{
  key: string; kind: 'remote'; depth: number; transient: RunHistoryTransientExecutionRow; teamStatus: TeamStatus | null
  /** The agent the row opens and its address (a Team row: its coordinator). */
  openAgentRunId: string; openAddress: string
}>
export type AgentOrgHistoryRow =
  | AgentOrgHistoryAgentRow
  | AgentOrgHistoryTeamRow
  | AgentOrgHistoryTaskAgentRow
  | AgentOrgHistoryTaskTeamRow
  | AgentOrgHistoryRemoteRow
export type AgentOrgHistoryDisplayRow = Readonly<{
  row: AgentOrgHistoryRow
  continuingAncestorDepths: readonly number[]
  hasFollowingSibling: boolean
}>

type StatusSource = Readonly<{
  authority: TeamStatusAuthority
  statusForAgentRunId(agentRunId: string): AgentStatus | string | null | undefined
  /** An agent's address in the Org's tree, for who started a delegated row; null when the tree does not hold it. */
  addressOf(agentRunId: string): string | null
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

const statusSource = (run: AgentOrgRunHistoryItem, context: AgentOrgExecutionContext | null): StatusSource => {
  const live = Boolean(
    run.isActive
    && context?.orgRunId === run.rootRunId
    && context.executionTree.rootOrg.orgRunId === run.rootRunId
    && context.isActive
    && context.phase === 'live',
  )
  const tree = context?.executionTree ?? run.executionTree
  const addresses = collectAgentAddresses(tree)
  return {
    authority: live ? 'live' : 'historical',
    addressOf: (agentRunId) => addresses.get(agentRunId) ?? null,
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
  statusForAgentRunId: source.statusForAgentRunId,
})

/**
 * The member an Org run opens on the phone (autobyteus-277 DEC-012): the first member of its configuration. A direct
 * agent opens itself; a configured Team opens its coordinator (the Org context's rule for a Team address). Null for an
 * Org with no member.
 */
export const agentOrgFirstMemberAddress = (run: AgentOrgRunHistoryItem): string | null =>
  run.executionTree.rootOrg.members[0]?.address ?? null

export const projectAgentOrgHistoryRows = (input: Readonly<{
  run: AgentOrgRunHistoryItem
  context: AgentOrgExecutionContext | null
  isTeamExpanded(address: string): boolean
  /** Delegated Teams start expanded; omit to show every delegated Team open. */
  isTaskTeamExpanded?(teamRunId: string): boolean
  /** The run's last answer from the history poll: its delegated rows while it is not open (SR-055). */
  listed: ListedRunAnswer | null
}>): AgentOrgHistoryDisplayRow[] => {
  const tree = input.context?.executionTree ?? input.run.executionTree
  const source = statusSource(input.run, input.context)
  const isTaskTeamExpanded = input.isTaskTeamExpanded ?? (() => true)
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
  }
  // Its delegated rows, by the one builder (CR-461-025): an open run's from its view (here and on peer nodes, with its
  // statuses as live as the view is); a run that is not open from the history poll's answer (SR-055, SR-057).
  const listed = input.context ? null : input.listed
  if (listed) {
    const answer = listedRunChildren(listed)
    rows.push(...agentOrgChildRows({ rootRunId: input.run.rootRunId, children: answer.children, statusOf: answer.statusOf, authority: 'live',
      teamsAlive: { local: true, peer: listed.isActive }, delegatorAddressOf: answer.delegatorAddressOf, isTaskTeamExpanded }))
  } else {
    const live = source.authority === 'live'
    rows.push(...agentOrgChildRows({ rootRunId: input.run.rootRunId,
      children: inDelegationOrder([...tree.rootOrg.taskExecutions.map(childOfCollaborationTask),
        ...(input.context?.remoteExecutions ?? []).map(childOfRemoteExecution)]),
      statusOf: source.statusForAgentRunId, authority: source.authority, teamsAlive: { local: live, peer: live },
      delegatorAddressOf: source.addressOf, isTaskTeamExpanded }))
  }

  const lines = treeLinesOf(rows.map((row) => row.depth))
  return rows.map((row, index) => ({ row, ...lines[index]! }))
}
