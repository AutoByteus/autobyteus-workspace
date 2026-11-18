import { describe, expect, it } from 'vitest'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import { teamAgentSourceOf } from '../agentSourceSelectors'

const created = '2026-09-30T00:00:00.000Z'
const launch = { runtime_kind: 'codex_app_server' as const, llm_model_identifier: 'root-model', llm_config: null, auto_execute_tools: false, workspace_root_path: null }
const edited = { ...launch, llm_model_identifier: 'edited-model' }

const teamTree = (): TeamRunExecutionTreeDto => ({
  created_at: created, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'review-team', team_definition_name: 'Product Review Team', team_run_id: 'team-run',
    coordinator_address: '/researcher', default_launch_configuration: launch,
    members: [
      { kind: 'configured_agent', address: '/researcher', agent_definition_id: 'researcher', role: null, description: null,
        agent_run_id: 'researcher-run', platform_agent_run_id: null, launch_configuration: launch },
      { kind: 'configured_agent', address: '/writer', agent_definition_id: 'writer', role: null, description: null,
        agent_run_id: 'writer-run', platform_agent_run_id: null, launch_configuration: edited },
    ],
  },
})

/** autobyteus-461 SR-084: a Team's own members take their source from its configuration; a run it delegated is its own. */
describe('teamAgentSourceOf', () => {
  it('resolves an own member by its run ID, with its own launch; nothing else', () => {
    const tree = teamTree()
    expect(teamAgentSourceOf(tree, 'researcher-run')).toMatchObject({ address: '/researcher', agent_definition_id: 'researcher', launch_configuration: launch })
    expect(teamAgentSourceOf(tree, 'writer-run')?.launch_configuration).toEqual(edited)
    expect(teamAgentSourceOf(tree, 'team-run')).toBeNull()
    expect(teamAgentSourceOf(tree, 'delegated-run')).toBeNull()
  })
})
