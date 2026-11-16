import type { AgentLaunchConfigurationDto, TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import { collectConfiguredAgents } from '~/services/teamExecution/teamExecutionTreeSelectors'

/** Where one of a Team's own members' definition and launch settings come from: its own configuration. */
export type TeamAgentSource = Readonly<{
  address: string
  agent_definition_id: string
  launch_configuration: AgentLaunchConfigurationDto
}>

/**
 * The Agent source of one of a Team root's own members, by its run ID (never by address); null for an agent that is not
 * one (a run the Team delegated is its own run, with its own launch: autobyteus-461 SR-084).
 */
export const teamAgentSourceOf = (tree: TeamRunExecutionTreeDto, agentRunId: string): TeamAgentSource | null => {
  const configured = collectConfiguredAgents(tree).find((agent) => agent.agent_run_id === agentRunId)
  return configured
    ? Object.freeze({ address: configured.address, agent_definition_id: configured.agent_definition_id, launch_configuration: configured.launch_configuration })
    : null
}
