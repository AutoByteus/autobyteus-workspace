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
import { MEMBER_RUN_SETTING_FIELDS, type RunSettingsValues } from '~/types/runSettings/RunSettings'
import {
  memberNode,
  type RunMemberLaunchFacts,
  type RunMemberLaunchFallback,
  type RunMemberLaunchSource,
  type RunMemberNode,
  type RunMemberNote,
  type RunMemberTreeDeps,
} from '~/utils/runSettings/runMemberTree'

/**
 * DS-007 / REQ-007 (SR-006): a run's collaborators and open delegated copies as read-only member
 * rows. One row per collaborator or copy, with a badge; a Team row describes what its members
 * without their own launch run on, and has its agents as child rows. Each row carries where its
 * launch came from; a Team-level fallback is noted once, on the Team row, and a member's own
 * fallbacks on that member. Member values are read only through the contract packages'
 * effective-member functions (DS-005). Closed copies (Task DONE or CANCELLED) are stopped and left
 * out, with everything under one. Keys are `<address>@<run ID>`: one address can hold a
 * collaborator and extra copies.
 */
type Launch = Readonly<{
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig: Readonly<Record<string, unknown>> | null
  autoExecuteTools: boolean
}> | null
type RecordedSource = Readonly<{
  origin: Exclude<RunMemberLaunchSource, 'configured' | 'not_recorded'>
  fallbacks: readonly RunMemberLaunchFallback[]
}>

const referenceKey = (reference: TaskExecutionReference): string =>
  'agentRunId' in reference ? `agent:${reference.agentRunId}` : `team:${reference.teamRunId}`
const nameAt = (address: string): string => address.split('/').filter(Boolean).at(-1) ?? address
const valuesOf = (launch: Launch): RunSettingsValues => ({
  workspace: null,
  runtimeKind: launch?.runtimeKind ?? '',
  llmModelIdentifier: launch?.llmModelIdentifier ?? '',
  llmConfig: launch?.llmConfig ? { ...launch.llmConfig } : null,
  autoExecuteTools: launch?.autoExecuteTools ?? false,
})
const CONFIGURED: RunMemberLaunchFacts = { sourceKey: 'configured', notes: [] }
const COPY_CONFIGURED: RunMemberLaunchFacts = { ...CONFIGURED, badge: 'delegated_copy' }

/** A row's source label and the fallbacks it shows itself (`ownNotes` false: a member whose source is its Team's). */
const factsOf = (source: RecordedSource | null, ownNotes = true, badge?: RunMemberNode['badge']): RunMemberLaunchFacts => ({
  ...(badge ? { badge } : {}),
  sourceKey: source?.origin ?? 'not_recorded',
  notes: ownNotes ? (source?.fallbacks ?? []).map((fallback): RunMemberNote => ({ kind: 'fallback', ...fallback })) : [],
})

/** Read-only nodes from neutral facts (both DTO casings), shaped like the run's own Members: a Team shows its settings card, then its agents. */
const builders = (deps: RunMemberTreeDeps) => ({
  agent: (key: string, address: string, launch: Launch, facts: RunMemberLaunchFacts, isCoordinator = false): RunMemberNode => {
    const values = valuesOf(launch)
    return memberNode({ key, kind: 'agent', name: nameAt(address), isCoordinator, values, parentValues: values,
      fields: MEMBER_RUN_SETTING_FIELDS, launch: facts }, deps)
  },
  team: (key: string, address: string, launch: Launch, facts: RunMemberLaunchFacts, children: readonly RunMemberNode[]): RunMemberNode => {
    const values = valuesOf(launch)
    return memberNode({ key, kind: 'team', name: nameAt(address), values, parentValues: values, fields: MEMBER_RUN_SETTING_FIELDS, children, launch: facts }, deps)
  },
})

// --- Team root (snake_case DTOs) ---

const snakeLaunch = (launch: AgentLaunchConfigurationDto | null | undefined): Launch => launch ? {
  runtimeKind: launch.runtime_kind, llmModelIdentifier: launch.llm_model_identifier,
  llmConfig: launch.llm_config, autoExecuteTools: launch.auto_execute_tools,
} : null
const snakeSource = (source: LaunchConfigurationSourceDto | null | undefined): RecordedSource | null => source ? {
  origin: source.origin,
  fallbacks: source.fallbacks.map((fallback) => ({
    layer: fallback.layer, runtimeKind: fallback.runtime_kind, llmModelIdentifier: fallback.llm_model_identifier, detail: fallback.detail,
  })),
} : null

export const teamDelegatedLaunchNodes = (
  tree: TeamRunExecutionTreeDto,
  closed: readonly TaskExecutionReference[],
  deps: RunMemberTreeDeps,
): RunMemberNode[] => {
  const build = builders(deps)
  const closedKeys = new Set(closed.map(referenceKey))
  const collaborators = tree.root_team.collaborators ?? []
  /** A Team copy without a recorded source runs as (and is led like) the collaborator or configured Team at its address. */
  const inRunTeamAt = (address: string) => collaborators.flatMap((entry) => entry.kind === 'agent_team' && entry.address === address ? [entry] : [])[0]
    ?? collectConfiguredTeams(tree).find((team) => team !== tree.root_team && team.address === address)
  const result: RunMemberNode[] = []
  for (const entry of collaborators) {
    if (entry.kind === 'agent') {
      result.push(build.agent(`${entry.address}@${entry.agent_run_id}`, entry.address, snakeLaunch(entry.launch_configuration),
        factsOf(snakeSource(entry.launch_source), true, 'collaborator')))
      continue
    }
    result.push(build.team(`${entry.address}@${entry.team_run_id}`, entry.address, snakeLaunch(entry.default_launch_configuration),
      factsOf(snakeSource(entry.default_launch_source), true, 'collaborator'),
      entry.members.map((member) => build.agent(`${member.address}@${member.agent_run_id}`, member.address,
        snakeLaunch(teamMemberLaunchConfiguration(entry, member)),
        factsOf(snakeSource(teamMemberLaunchSource(entry, member)), Boolean(member.launch_source)),
        member.address === entry.coordinator_address))))
  }
  const visit = (tasks: readonly TeamTaskExecutionDto[]): void => {
    for (const task of tasks) {
      if (task.kind === 'task_agent') {
        if (closedKeys.has(`agent:${task.agent_run_id}`)) continue
        result.push(build.agent(`${task.address}@${task.agent_run_id}`, task.address, task.source
          ? snakeLaunch(task.source.launch_configuration)
          : snakeLaunch(teamAgentSourceAt(tree, task.address)?.launch_configuration),
        task.source ? factsOf(snakeSource(task.source.launch_source), true, 'delegated_copy') : COPY_CONFIGURED))
        continue
      }
      if (closedKeys.has(`team:${task.team_run_id}`)) continue
      const source = task.source
      const members = task.members.flatMap((member) => {
        if (member.kind !== 'task_team_agent') return []
        const recorded = source?.members.find((candidate) => candidate.address === member.address)
        return [build.agent(`${member.address}@${member.agent_run_id}`, member.address, recorded && source
          ? snakeLaunch(teamMemberLaunchConfiguration(source, recorded))
          : snakeLaunch(teamAgentSourceAt(tree, member.address)?.launch_configuration),
        recorded && source ? factsOf(snakeSource(teamMemberLaunchSource(source, recorded)), Boolean(recorded.launch_source)) : CONFIGURED,
        member.address === (source ?? inRunTeamAt(task.address))?.coordinator_address)]
      })
      result.push(build.team(`${task.address}@${task.team_run_id}`, task.address,
        snakeLaunch(source ? source.default_launch_configuration : inRunTeamAt(task.address)?.default_launch_configuration),
        source ? factsOf(snakeSource(source.default_launch_source), true, 'delegated_copy') : COPY_CONFIGURED, members))
      visit(task.task_executions)
    }
  }
  visit([
    ...collectConfiguredTeams(tree).flatMap((team) => team.task_executions),
    ...collaborators.flatMap((entry) => entry.kind === 'agent_team' ? entry.task_executions : []),
  ])
  return result
}

// --- Org and Agent roots (camelCase DTOs) ---

type CamelLaunch = Extract<CollaboratorEntryDto, { kind: 'agent' }>['launchConfiguration']
const camelLaunch = (launch: CamelLaunch | null | undefined): Launch => launch ? {
  runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier,
  llmConfig: launch.llmConfig, autoExecuteTools: launch.autoExecuteTools,
} : null
const camelSource = (source: CollaborationLaunchConfigurationSourceDto | null | undefined): RecordedSource | null => source ? {
  origin: source.origin,
  fallbacks: source.fallbacks.map(({ layer, runtimeKind, llmModelIdentifier, detail }) => ({ layer, runtimeKind, llmModelIdentifier, detail })),
} : null

export const collaborationDelegatedLaunchNodes = (input: Readonly<{
  collaborators: readonly CollaboratorEntryDto[]
  /** Every task-execution list of the root (see `collaborationTaskExecutionLists`). */
  taskExecutions: readonly CollaborationTaskExecutionDto[]
  /** The launch of an in-run Agent or Team at an address (configured placement or collaborator), for copies without a recorded source. */
  launchAt(address: string): CamelLaunch | null
  /** The coordinator address of the in-run Team at an address, for Team copies without a recorded source. */
  coordinatorAt(address: string): string | null
  closed?: readonly TaskExecutionReference[]
}>, deps: RunMemberTreeDeps): RunMemberNode[] => {
  const build = builders(deps)
  const closedKeys = new Set((input.closed ?? []).map(referenceKey))
  const result: RunMemberNode[] = []
  for (const entry of input.collaborators) {
    if (entry.kind === 'agent') {
      result.push(build.agent(`${entry.address}@${entry.agentRunId}`, entry.address, camelLaunch(entry.launchConfiguration),
        factsOf(camelSource(entry.launchSource), true, 'collaborator')))
      continue
    }
    result.push(build.team(`${entry.address}@${entry.teamRunId}`, entry.address, camelLaunch(entry.defaultLaunchConfiguration),
      factsOf(camelSource(entry.defaultLaunchSource), true, 'collaborator'),
      entry.members.map((member) => build.agent(`${member.address}@${member.agentRunId}`, member.address,
        camelLaunch(collaborationMemberLaunchConfiguration(entry, member)),
        factsOf(camelSource(collaborationMemberLaunchSource(entry, member)), Boolean(member.launchSource)),
        member.address === entry.coordinatorAddress))))
  }
  const visit = (tasks: readonly CollaborationTaskExecutionDto[]): void => {
    for (const task of tasks) {
      if ('agentRunId' in task) {
        if (closedKeys.has(`agent:${task.agentRunId}`)) continue
        result.push(build.agent(`${task.address}@${task.agentRunId}`, task.address,
          camelLaunch(task.source ? task.source.launchConfiguration : input.launchAt(task.address)),
          task.source ? factsOf(camelSource(task.source.launchSource), true, 'delegated_copy') : COPY_CONFIGURED))
        continue
      }
      if (closedKeys.has(`team:${task.teamRunId}`)) continue
      const source = task.source
      const members = task.members.flatMap((member) => {
        if (!('agentRunId' in member)) return []
        const recorded = source?.members.find((candidate) => candidate.address === member.address)
        return [build.agent(`${member.address}@${member.agentRunId}`, member.address, recorded && source
          ? camelLaunch(collaborationMemberLaunchConfiguration(source, recorded))
          : camelLaunch(input.launchAt(member.address)),
        recorded && source ? factsOf(camelSource(collaborationMemberLaunchSource(source, recorded)), Boolean(recorded.launchSource)) : CONFIGURED,
        member.address === (source ? source.coordinatorAddress : input.coordinatorAt(task.address)))]
      })
      result.push(build.team(`${task.address}@${task.teamRunId}`, task.address,
        camelLaunch(source ? source.defaultLaunchConfiguration : input.launchAt(task.address)),
        source ? factsOf(camelSource(source.defaultLaunchSource), true, 'delegated_copy') : COPY_CONFIGURED, members))
      visit(task.taskExecutions)
    }
  }
  visit(input.taskExecutions)
  return result
}
