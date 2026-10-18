import {
  teamCopyAgentLaunch,
  teamMemberFollowsTeam,
  teamMemberLaunchConfiguration,
  type AgentLaunchConfigurationDto,
  type TaskExecutionDto as TeamTaskExecutionDto,
  type TeamRunExecutionTreeDto,
  type UserLaunchSelectionDto,
} from '@autobyteus/team-stream-contracts'
import {
  collaborationCopyAgentLaunch,
  collaborationMemberFollowsTeam,
  collaborationMemberLaunchConfiguration,
  type CollaborationTaskExecutionDto,
  type TaskAgentExecutionSourceDto,
  type UserLaunchSelectionDto as CollaborationSelectionDto,
} from '@autobyteus/collaboration-stream-contracts'
import { collectConfiguredAgents } from '~/services/teamExecution/teamExecutionTreeSelectors'
import { modelConfigsEqual } from '~/utils/teamRunConfigUtils'

/**
 * Where the definition and launch settings of an execution come from. A configured member is
 * its own source; a delegated copy started from the catalog carries its own `source` (REQ-011).
 * A Team member's launch is its own recorded launch, else its Team's, read only through the
 * contract packages' effective-member functions (DS-005).
 * Configured placements always win: catalog addresses never collide with them.
 *
 * Every copy agent at an address shares that address's started source; what one instance runs
 * with is its own user choice, else (when it follows its Team) its Team's choice, else that
 * started launch (DS-003). Given the agent's run ID, the selectors apply that rule with the
 * contract packages' functions and the server's follower rule: a recorded Team member (a catalog
 * copy's) follows iff it records no own launch; a member of a copy of a configured Team follows
 * iff its launch equals the configured Team's default (AR-003). Teams are flat: a Team copy's
 * members are Agents. Without a run ID they return the started source.
 */

/** The user choices that decide one agent instance's launch. */
type InstanceChoice<S> = Readonly<{ agentSelection?: S; teamSelection?: S; followsTeam: boolean }>

// --- Team root (snake_case DTOs) ---

export type TeamAgentSource = Readonly<{
  address: string
  agent_definition_id: string
  launch_configuration: AgentLaunchConfigurationDto
}>

/** The Agent source at an address inside a Team root's catalog copies (a copied Agent or a copy's member). */
export const teamCatalogAgentSourceAt = (tasks: readonly TeamTaskExecutionDto[], address: string): TeamAgentSource | null => {
  for (const task of tasks) {
    if (task.kind === 'task_agent') {
      if (task.source && task.address === address) {
        return Object.freeze({ address, agent_definition_id: task.source.agent_definition_id, launch_configuration: task.source.launch_configuration })
      }
      continue
    }
    const member = task.source?.members.find((candidate) => candidate.address === address)
    if (task.source && member) {
      return Object.freeze({ address, agent_definition_id: member.agent_definition_id, launch_configuration: teamMemberLaunchConfiguration(task.source, member) })
    }
    const nested = teamCatalogAgentSourceAt(task.task_executions, address)
    if (nested) return nested
  }
  return null
}

/** The choices recorded for one agent of a Team root's copies; null for any other agent. */
const teamInstanceChoice = (
  tree: TeamRunExecutionTreeDto,
  agentRunId: string,
): InstanceChoice<UserLaunchSelectionDto> | null => {
  // Teams are flat: a task Team copy is a catalog copy whose recorded source says who follows it.
  const follows = (task: Extract<TeamTaskExecutionDto, { kind: 'task_team' }>, address: string): boolean => {
    const recorded = task.source?.members.find((candidate) => candidate.address === address)
    return recorded ? teamMemberFollowsTeam(recorded) : false
  }
  const visit = (tasks: readonly TeamTaskExecutionDto[]): InstanceChoice<UserLaunchSelectionDto> | null => {
    for (const task of tasks) {
      if (task.kind === 'task_agent') {
        if (task.agent_run_id === agentRunId) return { agentSelection: task.user_launch_selection, followsTeam: false }
        continue
      }
      const member = task.members.find((candidate) => candidate.agent_run_id === agentRunId)
      if (member) {
        return { agentSelection: member.user_launch_selection, teamSelection: task.user_team_launch_selection, followsTeam: follows(task, member.address) }
      }
      const found = visit(task.task_executions)
      if (found) return found
    }
    return null
  }
  return visit(tree.root_team.task_executions)
}

/**
 * The Agent source at an address of a Team root: configured first, then a catalog copy. With
 * `agentRunId`, its launch is what that agent instance runs with.
 */
export const teamAgentSourceAt = (tree: TeamRunExecutionTreeDto, address: string, agentRunId?: string): TeamAgentSource | null => {
  const source = collectConfiguredAgents(tree).find((agent) => agent.address === address)
    ?? teamCatalogAgentSourceAt(tree.root_team.task_executions, address)
  const choice = source && agentRunId ? teamInstanceChoice(tree, agentRunId) : null
  if (!source || !choice) return source ?? null
  const { launch, selected } = teamCopyAgentLaunch({ started: source.launch_configuration, ...choice })
  return selected ? Object.freeze({ address: source.address, agent_definition_id: source.agent_definition_id, launch_configuration: launch }) : source
}

// --- Org and Agent roots (camelCase DTOs) ---

type LaunchConfiguration = TaskAgentExecutionSourceDto['launchConfiguration']

export type CollaborationAgentSource = Readonly<{
  address: string
  agentDefinitionId: string
  launchConfiguration: LaunchConfiguration
}>

export type CollaborationTeamSource = Readonly<{
  address: string
  coordinatorAddress: string
}>

const catalogSourceAt = (
  tasks: readonly CollaborationTaskExecutionDto[],
  address: string,
): CollaborationAgentSource | CollaborationTeamSource | null => {
  for (const task of tasks) {
    if ('agentRunId' in task) {
      if (task.source && task.address === address) {
        return Object.freeze({ address, agentDefinitionId: task.source.agentDefinitionId, launchConfiguration: task.source.launchConfiguration })
      }
      continue
    }
    if (task.source) {
      if (task.address === address) return Object.freeze({ address, coordinatorAddress: task.source.coordinatorAddress })
      const member = task.source.members.find((candidate) => candidate.address === address)
      if (member) {
        return Object.freeze({ address, agentDefinitionId: member.agentDefinitionId, launchConfiguration: collaborationMemberLaunchConfiguration(task.source, member) })
      }
    }
    const nested = catalogSourceAt(task.taskExecutions, address)
    if (nested) return nested
  }
  return null
}

/** Every task-execution list of an Org or Agent root: the root's and mounted Teams'. */
export const collaborationTaskExecutionLists = (input: Readonly<{
  taskExecutions: readonly CollaborationTaskExecutionDto[]
  members?: readonly object[]
}>): CollaborationTaskExecutionDto[] => [
  ...input.taskExecutions,
  ...(input.members ?? []).flatMap((member) =>
    'taskExecutions' in member ? (member as { taskExecutions: readonly CollaborationTaskExecutionDto[] }).taskExecutions : []),
]

const sameCamelLaunch = (left: LaunchConfiguration, right: LaunchConfiguration): boolean =>
  left.runtimeKind === right.runtimeKind && left.llmModelIdentifier === right.llmModelIdentifier
  && modelConfigsEqual(left.llmConfig ?? null, right.llmConfig ?? null)

/** An Org or Agent root's copies, for one agent instance's launch. */
export type CollaborationInstances = Readonly<{
  /** Every task-execution list of the root (see `collaborationTaskExecutionLists`). */
  taskExecutions: readonly CollaborationTaskExecutionDto[]
  /** The default launch of a configured Team at an address (Org roots), for copies of a configured placement. */
  configuredTeamLaunchAt?(address: string): LaunchConfiguration | null
}>

const collaborationInstanceChoice = (
  input: CollaborationInstances,
  agentRunId: string,
  started: LaunchConfiguration,
): InstanceChoice<CollaborationSelectionDto> | null => {
  const follows = (task: Extract<CollaborationTaskExecutionDto, { teamRunId: string }>, address: string): boolean => {
    if (task.source) {
      const recorded = task.source.members.find((candidate) => candidate.address === address)
      return recorded ? collaborationMemberFollowsTeam(recorded) : false
    }
    const team = input.configuredTeamLaunchAt?.(task.address) ?? null
    return team ? sameCamelLaunch(started, team) : false
  }
  const visit = (tasks: readonly CollaborationTaskExecutionDto[]): InstanceChoice<CollaborationSelectionDto> | null => {
    for (const task of tasks) {
      if ('agentRunId' in task) {
        if (task.agentRunId === agentRunId) return { agentSelection: task.userLaunchSelection, followsTeam: false }
        continue
      }
      const member = task.members.find((candidate) => candidate.agentRunId === agentRunId)
      if (member) {
        return { agentSelection: member.userLaunchSelection, teamSelection: task.userTeamLaunchSelection, followsTeam: follows(task, member.address) }
      }
      const found = visit(task.taskExecutions)
      if (found) return found
    }
    return null
  }
  return visit(input.taskExecutions)
}

/** What one copy agent of an Org or Agent root runs with, from its address's started source. */
export const collaborationInstanceSource = (
  input: CollaborationInstances,
  agentRunId: string,
  source: CollaborationAgentSource,
): CollaborationAgentSource => {
  const choice = collaborationInstanceChoice(input, agentRunId, source.launchConfiguration)
  if (!choice) return source
  const { launch, selected } = collaborationCopyAgentLaunch({ started: source.launchConfiguration, ...choice })
  return selected ? Object.freeze({ address: source.address, agentDefinitionId: source.agentDefinitionId, launchConfiguration: launch }) : source
}

/** The Agent source at an address inside an Org or Agent root's catalog copies. */
export const catalogAgentSourceAt = (
  tasks: readonly CollaborationTaskExecutionDto[],
  address: string,
): CollaborationAgentSource | null => {
  const source = catalogSourceAt(tasks, address)
  return source && 'agentDefinitionId' in source ? source : null
}

/** The Team source of a catalog Team copy at an address of an Org or Agent root. */
export const catalogTeamSourceAt = (
  tasks: readonly CollaborationTaskExecutionDto[],
  address: string,
): CollaborationTeamSource | null => {
  const source = catalogSourceAt(tasks, address)
  return source && 'coordinatorAddress' in source ? source : null
}
