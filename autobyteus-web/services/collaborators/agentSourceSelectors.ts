import type {
  AgentLaunchConfigurationDto,
  CollaboratorEntryDto as TeamCollaboratorEntryDto,
  TaskExecutionDto as TeamTaskExecutionDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts'
import type { CollaborationTaskExecutionDto, CollaboratorEntryDto } from '@autobyteus/collaboration-stream-contracts'
import { collectConfiguredAgents } from '~/services/teamExecution/teamExecutionTreeSelectors'

/**
 * Where the definition and launch settings of an execution come from. A configured member is
 * its own source; a task execution at a collaborator address takes its source from the
 * collaborator entry (the collaborator Agent itself, or a member of the collaborator Team); a
 * task copy started from the catalog carries its own `source` (REQ-011), which its members share.
 * Configured placements always win: collaborator and catalog addresses never collide with them.
 */

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
    ? Object.freeze({ address, agent_definition_id: member.agent_definition_id, launch_configuration: entry.default_launch_configuration })
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
      return Object.freeze({ address, agent_definition_id: member.agent_definition_id, launch_configuration: task.source.default_launch_configuration })
    }
    const nested = teamCatalogAgentSourceAt(task.task_executions, address)
    if (nested) return nested
  }
  return null
}

/** The Agent source at an address of a Team root: configured first, then collaborator, then a catalog copy. */
export const teamAgentSourceAt = (tree: TeamRunExecutionTreeDto, address: string): TeamAgentSource | null =>
  collectConfiguredAgents(tree).find((agent) => agent.address === address)
    ?? teamCollaboratorAgentSourceAt(tree.root_team.collaborators ?? [], address)
    ?? teamCatalogAgentSourceAt([
      ...tree.root_team.task_executions,
      ...(tree.root_team.collaborators ?? []).flatMap((entry) => entry.kind === 'agent_team' ? entry.task_executions : []),
    ], address)

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
    ? Object.freeze({ address, agentDefinitionId: member.agentDefinitionId, launchConfiguration: entry.defaultLaunchConfiguration })
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
        return Object.freeze({ address, agentDefinitionId: member.agentDefinitionId, launchConfiguration: task.source.defaultLaunchConfiguration })
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
