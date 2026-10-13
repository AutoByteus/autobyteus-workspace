import {
  teamCopyAgentLaunch,
  teamMemberFollowsTeam,
  teamMemberLaunchConfiguration,
  type AgentLaunchConfigurationDto,
  type CollaboratorEntryDto as TeamCollaboratorEntryDto,
  type TaskExecutionDto as TeamTaskExecutionDto,
  type TaskTeamMemberExecutionDto,
  type TeamRunExecutionTreeDto,
  type UserLaunchSelectionDto,
} from '@autobyteus/team-stream-contracts'
import {
  collaborationCopyAgentLaunch,
  collaborationMemberFollowsTeam,
  collaborationMemberLaunchConfiguration,
  type CollaborationTaskExecutionDto,
  type CollaboratorEntryDto,
  type UserLaunchSelectionDto as CollaborationSelectionDto,
} from '@autobyteus/collaboration-stream-contracts'
import { collectConfiguredAgents, collectConfiguredTeams } from '~/services/teamExecution/teamExecutionTreeSelectors'
import { modelConfigsEqual } from '~/utils/teamRunConfigUtils'

/**
 * Where the definition and launch settings of an execution come from. A configured member is
 * its own source; a task execution at a collaborator address takes its source from the
 * collaborator entry (the collaborator Agent itself, or a member of the collaborator Team); a
 * task copy started from the catalog carries its own `source` (REQ-011). A Team member's launch
 * is its own recorded launch, else its Team's, read only through the contract packages'
 * effective-member functions (DS-005).
 * Configured placements always win: collaborator and catalog addresses never collide with them.
 *
 * Every copy or collaborator agent at an address shares that address's started source; what one
 * instance runs with is its own user choice, else (when it follows its Team) its Team's choice,
 * else that started launch (DS-003). Given the agent's run ID, the selectors apply that rule with
 * the contract packages' functions and the server's follower rule: a recorded Team member (a
 * collaborator Team's or a catalog copy's) follows iff it records no own launch; a member of a copy
 * of a configured Team follows iff its launch equals the configured Team's default (AR-003); a
 * member of a nested Team never follows. Without a run ID they return the started source.
 */

/** The user choices that decide one agent instance's launch. */
type InstanceChoice<S> = Readonly<{ agentSelection?: S; teamSelection?: S; followsTeam: boolean }>

const firstSegment = (address: string): string => address.split('/').filter(Boolean)[0] ?? ''

const entryOwning = <T extends { address: string }>(entries: readonly T[], address: string): T | null => {
  const segment = firstSegment(address)
  return entries.find((entry) => firstSegment(entry.address) === segment) ?? null
}

// --- Team root (snake_case DTOs) ---

export type TeamAgentSource = Readonly<{
  address: string
  agent_definition_id: string
  launch_configuration: AgentLaunchConfigurationDto
}>

export const teamCollaboratorAgentSourceAt = (
  collaborators: readonly TeamCollaboratorEntryDto[],
  address: string,
): TeamAgentSource | null => {
  const entry = entryOwning(collaborators, address)
  if (!entry) return null
  if (entry.kind === 'agent') {
    return entry.address === address
      ? Object.freeze({ address, agent_definition_id: entry.agent_definition_id, launch_configuration: entry.launch_configuration })
      : null
  }
  const member = entry.members.find((candidate) => candidate.address === address)
  return member
    ? Object.freeze({ address, agent_definition_id: member.agent_definition_id, launch_configuration: teamMemberLaunchConfiguration(entry, member) })
    : null
}

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

const sameSnakeLaunch = (left: AgentLaunchConfigurationDto, right: AgentLaunchConfigurationDto): boolean =>
  left.runtime_kind === right.runtime_kind && left.llm_model_identifier === right.llm_model_identifier
  && modelConfigsEqual(left.llm_config ?? null, right.llm_config ?? null)

/** The choices recorded for one agent of a Team root's copies and collaborators; null for any other agent. */
const teamInstanceChoice = (
  tree: TeamRunExecutionTreeDto,
  agentRunId: string,
  started: AgentLaunchConfigurationDto,
): InstanceChoice<UserLaunchSelectionDto> | null => {
  const collaborators = tree.root_team.collaborators ?? []
  for (const entry of collaborators) {
    if (entry.kind === 'agent') {
      if (entry.agent_run_id === agentRunId) return { agentSelection: entry.user_launch_selection, followsTeam: false }
      continue
    }
    const member = entry.members.find((candidate) => candidate.agent_run_id === agentRunId)
    if (member) return { agentSelection: member.user_launch_selection, teamSelection: entry.user_team_launch_selection, followsTeam: teamMemberFollowsTeam(member) }
  }
  const follows = (task: Extract<TeamTaskExecutionDto, { kind: 'task_team' }>, address: string): boolean => {
    if (task.source) {
      const recorded = task.source.members.find((candidate) => candidate.address === address)
      return recorded ? teamMemberFollowsTeam(recorded) : false
    }
    const entry = teamCollaboratorTeamAt(collaborators, task.address)
    if (entry) {
      const recorded = entry.members.find((candidate) => candidate.address === address)
      return recorded ? teamMemberFollowsTeam(recorded) : false
    }
    const team = collectConfiguredTeams(tree).find((candidate) => candidate !== tree.root_team && candidate.address === task.address)
    return team ? sameSnakeLaunch(started, team.default_launch_configuration) : false
  }
  const visitNested = (members: readonly TaskTeamMemberExecutionDto[]): InstanceChoice<UserLaunchSelectionDto> | null => {
    for (const member of members) {
      if (member.kind === 'task_team_agent') {
        if (member.agent_run_id === agentRunId) return { agentSelection: member.user_launch_selection, followsTeam: false }
        continue
      }
      const found = visitNested(member.members) ?? visit(member.task_executions)
      if (found) return found
    }
    return null
  }
  const visit = (tasks: readonly TeamTaskExecutionDto[]): InstanceChoice<UserLaunchSelectionDto> | null => {
    for (const task of tasks) {
      if (task.kind === 'task_agent') {
        if (task.agent_run_id === agentRunId) return { agentSelection: task.user_launch_selection, followsTeam: false }
        continue
      }
      for (const member of task.members) {
        if (member.kind === 'task_team_agent') {
          if (member.agent_run_id === agentRunId) {
            return { agentSelection: member.user_launch_selection, teamSelection: task.user_team_launch_selection, followsTeam: follows(task, member.address) }
          }
          continue
        }
        const found = visitNested(member.members) ?? visit(member.task_executions)
        if (found) return found
      }
      const found = visit(task.task_executions)
      if (found) return found
    }
    return null
  }
  return visit([
    ...collectConfiguredTeams(tree).flatMap((team) => team.task_executions),
    ...collaborators.flatMap((entry) => entry.kind === 'agent_team' ? entry.task_executions : []),
  ])
}

/**
 * The Agent source at an address of a Team root: configured first, then collaborator, then a
 * catalog copy. With `agentRunId`, its launch is what that agent instance runs with.
 */
export const teamAgentSourceAt = (tree: TeamRunExecutionTreeDto, address: string, agentRunId?: string): TeamAgentSource | null => {
  const source = collectConfiguredAgents(tree).find((agent) => agent.address === address)
    ?? teamCollaboratorAgentSourceAt(tree.root_team.collaborators ?? [], address)
    ?? teamCatalogAgentSourceAt([
      ...tree.root_team.task_executions,
      ...(tree.root_team.collaborators ?? []).flatMap((entry) => entry.kind === 'agent_team' ? entry.task_executions : []),
    ], address)
  const choice = source && agentRunId ? teamInstanceChoice(tree, agentRunId, source.launch_configuration) : null
  if (!source || !choice) return source ?? null
  const { launch, selected } = teamCopyAgentLaunch({ started: source.launch_configuration, ...choice })
  return selected ? Object.freeze({ address: source.address, agent_definition_id: source.agent_definition_id, launch_configuration: launch }) : source
}

export const teamCollaboratorTeamAt = (
  collaborators: readonly TeamCollaboratorEntryDto[],
  address: string,
): Extract<TeamCollaboratorEntryDto, { kind: 'agent_team' }> | null => {
  const entry = entryOwning(collaborators, address)
  return entry?.kind === 'agent_team' && entry.address === address ? entry : null
}

// --- Org and Agent roots (camelCase DTOs) ---

type LaunchConfiguration = Extract<CollaboratorEntryDto, { kind: 'agent' }>['launchConfiguration']

export type CollaborationAgentSource = Readonly<{
  address: string
  agentDefinitionId: string
  launchConfiguration: LaunchConfiguration
}>

export type CollaborationTeamSource = Readonly<{
  address: string
  coordinatorAddress: string
}>

export const collaboratorAgentSourceAt = (
  collaborators: readonly CollaboratorEntryDto[],
  address: string,
): CollaborationAgentSource | null => {
  const entry = entryOwning(collaborators, address)
  if (!entry) return null
  if (entry.kind === 'agent') {
    return entry.address === address
      ? Object.freeze({ address, agentDefinitionId: entry.agentDefinitionId, launchConfiguration: entry.launchConfiguration })
      : null
  }
  const member = entry.members.find((candidate) => candidate.address === address)
  return member
    ? Object.freeze({ address, agentDefinitionId: member.agentDefinitionId, launchConfiguration: collaborationMemberLaunchConfiguration(entry, member) })
    : null
}

export const collaboratorTeamSourceAt = (
  collaborators: readonly CollaboratorEntryDto[],
  address: string,
): CollaborationTeamSource | null => {
  const entry = entryOwning(collaborators, address)
  return entry?.kind === 'agent_team' && entry.address === address
    ? Object.freeze({ address, coordinatorAddress: entry.coordinatorAddress })
    : null
}

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
    const nested = catalogSourceAt([
      ...task.taskExecutions,
      ...task.members.flatMap((member) => 'teamRunId' in member ? member.taskExecutions : []),
    ], address)
    if (nested) return nested
  }
  return null
}

/** Every task-execution list of an Org or Agent root: the root's, mounted Teams' and collaborator Teams'. */
export const collaborationTaskExecutionLists = (input: Readonly<{
  taskExecutions: readonly CollaborationTaskExecutionDto[]
  members?: readonly object[]
  collaborators?: readonly CollaboratorEntryDto[]
}>): CollaborationTaskExecutionDto[] => [
  ...input.taskExecutions,
  ...(input.members ?? []).flatMap((member) =>
    'taskExecutions' in member ? (member as { taskExecutions: readonly CollaborationTaskExecutionDto[] }).taskExecutions : []),
  ...(input.collaborators ?? []).flatMap((entry) => entry.kind === 'agent_team' ? entry.taskExecutions : []),
]

const sameCamelLaunch = (left: LaunchConfiguration, right: LaunchConfiguration): boolean =>
  left.runtimeKind === right.runtimeKind && left.llmModelIdentifier === right.llmModelIdentifier
  && modelConfigsEqual(left.llmConfig ?? null, right.llmConfig ?? null)

/** An Org or Agent root's copies and collaborators, for one agent instance's launch. */
export type CollaborationInstances = Readonly<{
  collaborators: readonly CollaboratorEntryDto[]
  /** Every task-execution list of the root (see `collaborationTaskExecutionLists`). */
  taskExecutions: readonly CollaborationTaskExecutionDto[]
  /** The default launch of a configured Team at an address (Org roots), for copies of a configured placement. */
  configuredTeamLaunchAt?(address: string): LaunchConfiguration | null
}>

type CamelTaskMember = Extract<CollaborationTaskExecutionDto, { teamRunId: string }>['members'][number]

const collaborationInstanceChoice = (
  input: CollaborationInstances,
  agentRunId: string,
  started: LaunchConfiguration,
): InstanceChoice<CollaborationSelectionDto> | null => {
  for (const entry of input.collaborators) {
    if (entry.kind === 'agent') {
      if (entry.agentRunId === agentRunId) return { agentSelection: entry.userLaunchSelection, followsTeam: false }
      continue
    }
    const member = entry.members.find((candidate) => candidate.agentRunId === agentRunId)
    if (member) return { agentSelection: member.userLaunchSelection, teamSelection: entry.userTeamLaunchSelection, followsTeam: collaborationMemberFollowsTeam(member) }
  }
  const follows = (task: Extract<CollaborationTaskExecutionDto, { teamRunId: string }>, address: string): boolean => {
    if (task.source) {
      const recorded = task.source.members.find((candidate) => candidate.address === address)
      return recorded ? collaborationMemberFollowsTeam(recorded) : false
    }
    const entry = entryOwning(input.collaborators, task.address)
    if (entry?.kind === 'agent_team' && entry.address === task.address) {
      const recorded = entry.members.find((candidate) => candidate.address === address)
      return recorded ? collaborationMemberFollowsTeam(recorded) : false
    }
    const team = input.configuredTeamLaunchAt?.(task.address) ?? null
    return team ? sameCamelLaunch(started, team) : false
  }
  const visitNested = (members: readonly CamelTaskMember[]): InstanceChoice<CollaborationSelectionDto> | null => {
    for (const member of members) {
      if ('agentRunId' in member) {
        if (member.agentRunId === agentRunId) return { agentSelection: member.userLaunchSelection, followsTeam: false }
        continue
      }
      const found = visitNested(member.members) ?? visit(member.taskExecutions)
      if (found) return found
    }
    return null
  }
  const visit = (tasks: readonly CollaborationTaskExecutionDto[]): InstanceChoice<CollaborationSelectionDto> | null => {
    for (const task of tasks) {
      if ('agentRunId' in task) {
        if (task.agentRunId === agentRunId) return { agentSelection: task.userLaunchSelection, followsTeam: false }
        continue
      }
      for (const member of task.members) {
        if ('agentRunId' in member) {
          if (member.agentRunId === agentRunId) {
            return { agentSelection: member.userLaunchSelection, teamSelection: task.userTeamLaunchSelection, followsTeam: follows(task, member.address) }
          }
          continue
        }
        const found = visitNested(member.members) ?? visit(member.taskExecutions)
        if (found) return found
      }
      const found = visit(task.taskExecutions)
      if (found) return found
    }
    return null
  }
  return visit(input.taskExecutions)
}

/** What one copy or collaborator agent of an Org or Agent root runs with, from its address's started source. */
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

/** A collaborator's hosted executions in the delegated-child node shape (Org and Agent roots). */
export type CollaboratorExecutionNode =
  | Readonly<{ address: string; agentRunId: string; platformAgentRunId: string | null; delegatorAgentRunId?: string; startedAt: string }>
  | Readonly<{
      address: string
      teamRunId: string
      members: readonly Readonly<{ address: string; agentRunId: string; platformAgentRunId: string | null }>[]
      taskExecutions: Extract<CollaboratorEntryDto, { kind: 'agent_team' }>['taskExecutions']
      delegatorAgentRunId?: string
      startedAt: string
    }>

/**
 * Collaborators shown with the product's task rows (approved look): an Agent as a delegated
 * Agent at the root, a Team as a delegated Team with its members and its own delegations. The
 * user's send added it, so `addedViaAgentRunId` is its starter.
 */
export const collaboratorExecutionNodes = (collaborators: readonly CollaboratorEntryDto[]): CollaboratorExecutionNode[] =>
  collaborators.map((entry): CollaboratorExecutionNode => entry.kind === 'agent'
    ? Object.freeze({
        address: entry.address, agentRunId: entry.agentRunId, platformAgentRunId: entry.platformAgentRunId,
        delegatorAgentRunId: entry.addedViaAgentRunId, startedAt: entry.addedAt,
      })
    : Object.freeze({
        address: entry.address, teamRunId: entry.teamRunId,
        members: entry.members.map((member) => Object.freeze({
          address: member.address, agentRunId: member.agentRunId, platformAgentRunId: member.platformAgentRunId,
        })),
        taskExecutions: entry.taskExecutions,
        delegatorAgentRunId: entry.addedViaAgentRunId, startedAt: entry.addedAt,
      }))
