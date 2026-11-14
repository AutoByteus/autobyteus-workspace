import {
  type AgentLaunchConfigurationDto,
  type TaskExecutionDto as TeamTaskExecutionDto,
  type TeamRunExecutionTreeDto,
} from '@autobyteus/team-stream-contracts'
import {
  type CollaborationTaskExecutionDto,
  type TaskAgentExecutionSourceDto,
} from '@autobyteus/collaboration-stream-contracts'
import { collectConfiguredAgents } from '~/services/teamExecution/teamExecutionTreeSelectors'

/**
 * Where the definition and launch settings of one agent execution come from, by its run ID (never by
 * address: a configured member and the copies started from it share an address). A configured member
 * is its own source; a delegated copy (a copied Agent, or a member of a copied Team) carries its own
 * recorded `source`, whether it started from the catalog or from a configured placement (REQ-001,
 * REQ-004).
 *
 * What one copy agent runs with is the launch its own run has (autobyteus-461: a child's change is saved
 * by its own run, SR-039). A Team copy's member records its complete launch; a Team-level choice is the
 * Team's default only (CR-461-089). Teams are flat: a Team copy's members are Agents.
 */

/** One copy agent's launch and definition. */
type CopyAgent<L> = Readonly<{ address: string; agentDefinitionId: string; launch: L }>

// --- Team root (snake_case DTOs) ---

export type TeamAgentSource = Readonly<{
  address: string
  agent_definition_id: string
  launch_configuration: AgentLaunchConfigurationDto
}>

const teamCopyAgent = (
  tasks: readonly TeamTaskExecutionDto[],
  agentRunId: string,
): CopyAgent<AgentLaunchConfigurationDto> | null => {
  for (const task of tasks) {
    if (task.kind === 'task_agent') {
      if (task.agent_run_id === agentRunId) {
        return { address: task.address, agentDefinitionId: task.source.agent_definition_id, launch: task.source.launch_configuration }
      }
      continue
    }
    const member = task.members.find((candidate) => candidate.agent_run_id === agentRunId)
    const recorded = member && task.source.members.find((candidate) => candidate.address === member.address)
    if (member && recorded) {
      return { address: member.address, agentDefinitionId: recorded.agent_definition_id, launch: recorded.launch_configuration }
    }
    const nested = teamCopyAgent(task.task_executions, agentRunId)
    if (nested) return nested
  }
  return null
}

/**
 * The Agent source of one agent execution of a Team root: a configured member's own, else a copy's
 * recorded source with the launch its run has.
 */
export const teamAgentSourceOf = (tree: TeamRunExecutionTreeDto, agentRunId: string): TeamAgentSource | null => {
  const configured = collectConfiguredAgents(tree).find((agent) => agent.agent_run_id === agentRunId)
  if (configured) {
    return Object.freeze({ address: configured.address, agent_definition_id: configured.agent_definition_id, launch_configuration: configured.launch_configuration })
  }
  const copy = teamCopyAgent(tree.root_team.task_executions, agentRunId)
  if (!copy) return null
  return Object.freeze({ address: copy.address, agent_definition_id: copy.agentDefinitionId, launch_configuration: copy.launch })
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

/** Every task-execution list of an Org or Agent root: the root's and mounted Teams'. */
export const collaborationTaskExecutionLists = (input: Readonly<{
  taskExecutions: readonly CollaborationTaskExecutionDto[]
  members?: readonly object[]
}>): CollaborationTaskExecutionDto[] => [
  ...input.taskExecutions,
  ...(input.members ?? []).flatMap((member) =>
    'taskExecutions' in member ? (member as { taskExecutions: readonly CollaborationTaskExecutionDto[] }).taskExecutions : []),
]

const collaborationCopyAgent = (
  tasks: readonly CollaborationTaskExecutionDto[],
  agentRunId: string,
): CopyAgent<LaunchConfiguration> | null => {
  for (const task of tasks) {
    if ('agentRunId' in task) {
      if (task.agentRunId === agentRunId) {
        return { address: task.address, agentDefinitionId: task.source.agentDefinitionId, launch: task.source.launchConfiguration }
      }
      continue
    }
    const member = task.members.find((candidate) => candidate.agentRunId === agentRunId)
    const recorded = member && task.source.members.find((candidate) => candidate.address === member.address)
    if (member && recorded) {
      return { address: member.address, agentDefinitionId: recorded.agentDefinitionId, launch: recorded.launchConfiguration }
    }
    const nested = collaborationCopyAgent(task.taskExecutions, agentRunId)
    if (nested) return nested
  }
  return null
}

/**
 * What one copy agent of an Org or Agent root runs with, by its run ID: its recorded source with the launch
 * its run has. `tasks` are every task-execution list of the root
 * (`collaborationTaskExecutionLists`); null for any other run.
 */
export const copyAgentSourceOf = (
  tasks: readonly CollaborationTaskExecutionDto[],
  agentRunId: string,
): CollaborationAgentSource | null => {
  const copy = collaborationCopyAgent(tasks, agentRunId)
  if (!copy) return null
  return Object.freeze({ address: copy.address, agentDefinitionId: copy.agentDefinitionId, launchConfiguration: copy.launch })
}

/** The Team source of a Team copy of an Org or Agent root, by its run ID; null for any other run. */
export const copyTeamSourceOf = (
  tasks: readonly CollaborationTaskExecutionDto[],
  teamRunId: string,
): CollaborationTeamSource | null => {
  for (const task of tasks) {
    if ('agentRunId' in task) continue
    if (task.teamRunId === teamRunId) return Object.freeze({ address: task.address, coordinatorAddress: task.source.coordinatorAddress })
    const nested = copyTeamSourceOf(task.taskExecutions, teamRunId)
    if (nested) return nested
  }
  return null
}
