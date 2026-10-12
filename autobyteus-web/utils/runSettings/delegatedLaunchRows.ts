import {
  teamMemberLaunchConfiguration,
  teamMemberLaunchSource,
  type AgentLaunchConfigurationDto,
  type LaunchConfigurationSourceDto,
  type TaskExecutionDto as TeamTaskExecutionDto,
  type TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts'
import {
  collaborationMemberLaunchConfiguration,
  collaborationMemberLaunchSource,
  type CollaborationLaunchConfigurationSourceDto,
  type CollaborationTaskExecutionDto,
  type CollaboratorEntryDto,
} from '@autobyteus/collaboration-stream-contracts'
import { collectConfiguredTeams } from '~/services/teamExecution/teamExecutionTreeSelectors'
import { teamAgentSourceAt } from '~/services/collaborators/agentSourceSelectors'
import type { TaskExecutionReference } from '~/utils/collaboration/taskExecutionClosure'

/**
 * DS-007 / REQ-007: the read-only rows of a run's collaborators and open delegated copies, each
 * agent with the runtime and model it runs on, where they came from and any fallback. Member
 * values are read through the contract packages' effective-member functions (DS-005). Closed
 * copies (Task DONE or CANCELLED) are stopped and left out; so is everything under one.
 */
export type DelegatedLaunchSource = 'agent_default' | 'team_default' | 'inherited' | 'configured' | 'not_recorded'

export type DelegatedLaunchFallback = Readonly<{
  layer: 'agent_default' | 'team_default'
  runtimeKind: string | null
  llmModelIdentifier: string | null
  detail: string
}>

export type DelegatedLaunchRow = Readonly<{
  key: string
  /** How it joined the run: brought in (one shared instance) or started by `delegate_task`. */
  entry: 'collaborator' | 'copy'
  /** A Team row describes what its members without their own launch run on. */
  subject: 'agent' | 'team'
  /** A member row of the Team row above it. */
  member: boolean
  address: string
  runtimeKind: string | null
  llmModelIdentifier: string | null
  source: DelegatedLaunchSource
  fallbacks: readonly DelegatedLaunchFallback[]
}>

type Launch = Readonly<{ runtimeKind: string; llmModelIdentifier: string }> | null
type Source = Readonly<{ source: DelegatedLaunchSource; fallbacks: readonly DelegatedLaunchFallback[] }>

const NOT_RECORDED: Source = { source: 'not_recorded', fallbacks: [] }
const CONFIGURED: Source = { source: 'configured', fallbacks: [] }
const referenceKey = (reference: TaskExecutionReference): string =>
  'agentRunId' in reference ? `agent:${reference.agentRunId}` : `team:${reference.teamRunId}`

const row = (
  entry: DelegatedLaunchRow['entry'], subject: DelegatedLaunchRow['subject'], member: boolean,
  address: string, key: string, launch: Launch, source: Source,
): DelegatedLaunchRow => Object.freeze({
  key, entry, subject, member, address,
  runtimeKind: launch?.runtimeKind ?? null,
  llmModelIdentifier: launch?.llmModelIdentifier ?? null,
  source: source.source,
  fallbacks: source.fallbacks,
})

// --- Team root (snake_case DTOs) ---

const snakeLaunch = (launch: AgentLaunchConfigurationDto | null | undefined): Launch =>
  launch ? { runtimeKind: launch.runtime_kind, llmModelIdentifier: launch.llm_model_identifier } : null
const snakeSource = (source: LaunchConfigurationSourceDto | null | undefined): Source => source ? {
  source: source.origin,
  fallbacks: source.fallbacks.map((fallback) => ({
    layer: fallback.layer, runtimeKind: fallback.runtime_kind, llmModelIdentifier: fallback.llm_model_identifier, detail: fallback.detail,
  })),
} : NOT_RECORDED

export const teamDelegatedLaunchRows = (
  tree: TeamRunExecutionTreeDto,
  closed: readonly TaskExecutionReference[] = [],
): DelegatedLaunchRow[] => {
  const rows: DelegatedLaunchRow[] = []
  const closedKeys = new Set(closed.map(referenceKey))
  for (const entry of tree.root_team.collaborators ?? []) {
    if (entry.kind === 'agent') {
      rows.push(row('collaborator', 'agent', false, entry.address, entry.agent_run_id, snakeLaunch(entry.launch_configuration), snakeSource(entry.launch_source)))
      continue
    }
    rows.push(row('collaborator', 'team', false, entry.address, entry.team_run_id, snakeLaunch(entry.default_launch_configuration), snakeSource(entry.default_launch_source)))
    for (const member of entry.members) {
      rows.push(row('collaborator', 'agent', true, member.address, member.agent_run_id,
        snakeLaunch(teamMemberLaunchConfiguration(entry, member)), snakeSource(teamMemberLaunchSource(entry, member))))
    }
  }
  const visit = (tasks: readonly TeamTaskExecutionDto[]): void => {
    for (const task of tasks) {
      if (task.kind === 'task_agent') {
        if (closedKeys.has(`agent:${task.agent_run_id}`)) continue
        rows.push(row('copy', 'agent', false, task.address, task.agent_run_id, task.source
          ? snakeLaunch(task.source.launch_configuration)
          : snakeLaunch(teamAgentSourceAt(tree, task.address)?.launch_configuration), task.source ? snakeSource(task.source.launch_source) : CONFIGURED))
        continue
      }
      if (closedKeys.has(`team:${task.team_run_id}`)) continue
      const source = task.source
      rows.push(row('copy', 'team', false, task.address, task.team_run_id,
        snakeLaunch(source?.default_launch_configuration), source ? snakeSource(source.default_launch_source) : CONFIGURED))
      for (const member of task.members) {
        if (member.kind !== 'task_team_agent') continue
        const recorded = source?.members.find((candidate) => candidate.address === member.address)
        rows.push(row('copy', 'agent', true, member.address, member.agent_run_id, recorded && source
          ? snakeLaunch(teamMemberLaunchConfiguration(source, recorded))
          : snakeLaunch(teamAgentSourceAt(tree, member.address)?.launch_configuration),
        recorded && source ? snakeSource(teamMemberLaunchSource(source, recorded)) : CONFIGURED))
      }
      visit(task.task_executions)
    }
  }
  visit([
    ...collectConfiguredTeams(tree).flatMap((team) => team.task_executions),
    ...(tree.root_team.collaborators ?? []).flatMap((entry) => entry.kind === 'agent_team' ? entry.task_executions : []),
  ])
  return rows
}

// --- Org and Agent roots (camelCase DTOs) ---

type CamelLaunch = Extract<CollaboratorEntryDto, { kind: 'agent' }>['launchConfiguration']
const camelLaunch = (launch: CamelLaunch | null | undefined): Launch =>
  launch ? { runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier } : null
const camelSource = (source: CollaborationLaunchConfigurationSourceDto | null | undefined): Source => source ? {
  source: source.origin,
  fallbacks: source.fallbacks.map(({ layer, runtimeKind, llmModelIdentifier, detail }) => ({ layer, runtimeKind, llmModelIdentifier, detail })),
} : NOT_RECORDED

export const collaborationDelegatedLaunchRows = (input: Readonly<{
  collaborators: readonly CollaboratorEntryDto[]
  /** Every task-execution list of the root (see `collaborationTaskExecutionLists`). */
  taskExecutions: readonly CollaborationTaskExecutionDto[]
  /** The launch of an in-run agent at an address (configured placement or collaborator), for copies without a recorded source. */
  launchAt(address: string): CamelLaunch | null
  closed?: readonly TaskExecutionReference[]
}>): DelegatedLaunchRow[] => {
  const rows: DelegatedLaunchRow[] = []
  const closedKeys = new Set((input.closed ?? []).map(referenceKey))
  for (const entry of input.collaborators) {
    if (entry.kind === 'agent') {
      rows.push(row('collaborator', 'agent', false, entry.address, entry.agentRunId, camelLaunch(entry.launchConfiguration), camelSource(entry.launchSource)))
      continue
    }
    rows.push(row('collaborator', 'team', false, entry.address, entry.teamRunId, camelLaunch(entry.defaultLaunchConfiguration), camelSource(entry.defaultLaunchSource)))
    for (const member of entry.members) {
      rows.push(row('collaborator', 'agent', true, member.address, member.agentRunId,
        camelLaunch(collaborationMemberLaunchConfiguration(entry, member)), camelSource(collaborationMemberLaunchSource(entry, member))))
    }
  }
  const visit = (tasks: readonly CollaborationTaskExecutionDto[]): void => {
    for (const task of tasks) {
      if ('agentRunId' in task) {
        if (closedKeys.has(`agent:${task.agentRunId}`)) continue
        rows.push(row('copy', 'agent', false, task.address, task.agentRunId,
          camelLaunch(task.source ? task.source.launchConfiguration : input.launchAt(task.address)), task.source ? camelSource(task.source.launchSource) : CONFIGURED))
        continue
      }
      if (closedKeys.has(`team:${task.teamRunId}`)) continue
      const source = task.source
      rows.push(row('copy', 'team', false, task.address, task.teamRunId,
        camelLaunch(source?.defaultLaunchConfiguration), source ? camelSource(source.defaultLaunchSource) : CONFIGURED))
      for (const member of task.members) {
        if (!('agentRunId' in member)) continue
        const recorded = source?.members.find((candidate) => candidate.address === member.address)
        rows.push(row('copy', 'agent', true, member.address, member.agentRunId, recorded && source
          ? camelLaunch(collaborationMemberLaunchConfiguration(source, recorded))
          : camelLaunch(input.launchAt(member.address)),
        recorded && source ? camelSource(collaborationMemberLaunchSource(source, recorded)) : CONFIGURED))
      }
      visit(task.taskExecutions)
    }
  }
  visit(input.taskExecutions)
  return rows
}
