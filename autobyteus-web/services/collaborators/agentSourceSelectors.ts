import {
  teamCopyAgentLaunch,
  type AgentLaunchConfigurationDto,
  type TaskExecutionDto as TeamTaskExecutionDto,
  type TeamRunExecutionTreeDto,
  type UserLaunchSelectionDto,
} from '@autobyteus/team-stream-contracts'
import {
  collaborationCopyAgentLaunch,
  type CollaborationTaskExecutionDto,
  type TaskAgentExecutionSourceDto,
  type UserLaunchSelectionDto as CollaborationSelectionDto,
} from '@autobyteus/collaboration-stream-contracts'
import { collectConfiguredAgents } from '~/services/teamExecution/teamExecutionTreeSelectors'

/**
 * Where the definition and launch settings of one agent execution come from, by its run ID (never by
 * address: a configured member and the copies started from it share an address). A configured member
 * is its own source; a delegated copy (a copied Agent, or a member of a copied Team) carries its own
 * recorded `source`, whether it started from the catalog or from a configured placement (REQ-001,
 * REQ-004).
 *
 * What one copy agent runs with is its own user choice, else (when it follows its Team) its Team's
 * choice, else its started launch (DS-003), applied with the contract packages' functions. A Team
 * copy's member records its complete started launch and whether it follows the Team (`followsTeam`,
 * D-5). Teams are flat: a Team copy's members are Agents.
 */

/** The user choices that decide one agent instance's launch. */
type InstanceChoice<S> = Readonly<{ agentSelection?: S; teamSelection?: S; followsTeam: boolean }>
/** One copy agent's started launch, definition and choices. */
type CopyAgent<L, S> = Readonly<{ address: string; agentDefinitionId: string; started: L; choice: InstanceChoice<S> }>

// --- Team root (snake_case DTOs) ---

export type TeamAgentSource = Readonly<{
  address: string
  agent_definition_id: string
  launch_configuration: AgentLaunchConfigurationDto
}>

const teamCopyAgent = (
  tasks: readonly TeamTaskExecutionDto[],
  agentRunId: string,
): CopyAgent<AgentLaunchConfigurationDto, UserLaunchSelectionDto> | null => {
  for (const task of tasks) {
    if (task.kind === 'task_agent') {
      if (task.agent_run_id === agentRunId) {
        return { address: task.address, agentDefinitionId: task.source.agent_definition_id, started: task.source.launch_configuration,
          choice: { agentSelection: task.user_launch_selection, followsTeam: false } }
      }
      continue
    }
    const member = task.members.find((candidate) => candidate.agent_run_id === agentRunId)
    const recorded = member && task.source.members.find((candidate) => candidate.address === member.address)
    if (member && recorded) {
      return { address: member.address, agentDefinitionId: recorded.agent_definition_id, started: recorded.launch_configuration,
        choice: { agentSelection: member.user_launch_selection, teamSelection: task.user_team_launch_selection, followsTeam: recorded.follows_team } }
    }
    const nested = teamCopyAgent(task.task_executions, agentRunId)
    if (nested) return nested
  }
  return null
}

/**
 * The Agent source of one agent execution of a Team root: a configured member's own, else a copy's
 * recorded source with what that instance runs with (its user choice, else its Team's when it follows).
 */
export const teamAgentSourceOf = (tree: TeamRunExecutionTreeDto, agentRunId: string): TeamAgentSource | null => {
  const configured = collectConfiguredAgents(tree).find((agent) => agent.agent_run_id === agentRunId)
  if (configured) {
    return Object.freeze({ address: configured.address, agent_definition_id: configured.agent_definition_id, launch_configuration: configured.launch_configuration })
  }
  const copy = teamCopyAgent(tree.root_team.task_executions, agentRunId)
  if (!copy) return null
  const { launch } = teamCopyAgentLaunch({ started: copy.started, ...copy.choice })
  return Object.freeze({ address: copy.address, agent_definition_id: copy.agentDefinitionId, launch_configuration: launch })
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
): CopyAgent<LaunchConfiguration, CollaborationSelectionDto> | null => {
  for (const task of tasks) {
    if ('agentRunId' in task) {
      if (task.agentRunId === agentRunId) {
        return { address: task.address, agentDefinitionId: task.source.agentDefinitionId, started: task.source.launchConfiguration,
          choice: { agentSelection: task.userLaunchSelection, followsTeam: false } }
      }
      continue
    }
    const member = task.members.find((candidate) => candidate.agentRunId === agentRunId)
    const recorded = member && task.source.members.find((candidate) => candidate.address === member.address)
    if (member && recorded) {
      return { address: member.address, agentDefinitionId: recorded.agentDefinitionId, started: recorded.launchConfiguration,
        choice: { agentSelection: member.userLaunchSelection, teamSelection: task.userTeamLaunchSelection, followsTeam: recorded.followsTeam } }
    }
    const nested = collaborationCopyAgent(task.taskExecutions, agentRunId)
    if (nested) return nested
  }
  return null
}

/**
 * What one copy agent of an Org or Agent root runs with, by its run ID: its recorded source with its user
 * choice, else its Team's when it follows. `tasks` are every task-execution list of the root
 * (`collaborationTaskExecutionLists`); null for any other run.
 */
export const copyAgentSourceOf = (
  tasks: readonly CollaborationTaskExecutionDto[],
  agentRunId: string,
): CollaborationAgentSource | null => {
  const copy = collaborationCopyAgent(tasks, agentRunId)
  if (!copy) return null
  const { launch } = collaborationCopyAgentLaunch({ started: copy.started, ...copy.choice })
  return Object.freeze({ address: copy.address, agentDefinitionId: copy.agentDefinitionId, launchConfiguration: launch })
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
