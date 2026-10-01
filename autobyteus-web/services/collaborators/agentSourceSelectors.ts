import type {
  AgentLaunchConfigurationDto,
  CollaboratorEntryDto as TeamCollaboratorEntryDto,
  TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts'
import type { CollaboratorEntryDto } from '@autobyteus/collaboration-stream-contracts'
import { collectConfiguredAgents } from '~/services/teamExecution/teamExecutionTreeSelectors'

/**
 * Where the definition and launch settings of an execution come from. A configured member is
 * its own source; a task execution at a collaborator address takes its source from the
 * collaborator entry (the collaborator Agent itself, or a member of the collaborator Team).
 * Configured placements always win: collaborator addresses never collide with them.
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

/** The Agent source at an address of a Team root: configured first, then collaborator. */
export const teamAgentSourceAt = (tree: TeamRunExecutionTreeDto, address: string): TeamAgentSource | null =>
  collectConfiguredAgents(tree).find((agent) => agent.address === address)
    ?? teamCollaboratorAgentSourceAt(tree.root_team.collaborators ?? [], address)

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
