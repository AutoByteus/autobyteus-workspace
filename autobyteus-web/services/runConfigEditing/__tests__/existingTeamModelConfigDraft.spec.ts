import { describe, expect, it } from 'vitest'
import type { AgentLaunchConfigurationDto, TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import {
  createExistingTeamModelConfigDraft,
  planExistingTeamModelConfigPatches,
  updateExistingTeamScopeModelConfig,
} from '../existingTeamModelConfigDraft'

const launch = (
  model: string,
  config: NonNullable<AgentLaunchConfigurationDto['llm_config']>,
): AgentLaunchConfigurationDto => ({
  runtime_kind: 'codex_app_server',
  llm_model_identifier: model,
  llm_config: config,
  auto_execute_tools: false,
  skill_access_mode: 'PRELOADED_ONLY',
  workspace_root_path: '/workspace',
})
const tree = (): TeamRunExecutionTreeDto => ({
  schema_version: 2,
  created_at: '2026-08-25T00:00:00.000Z',
  archived_at: null,
  application_binding: null,
  handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'root-def', team_definition_name: 'Team', team_run_id: 'root-run',
    coordinator_address: '/linked', default_launch_configuration: launch('gpt', { effort: 'medium' }), task_executions: [],
    members: [
      {
        kind: 'configured_agent', address: '/linked', agent_definition_id: 'linked-def', role: null, description: null,
        agent_run_id: 'linked-run', platform_agent_run_id: null, launch_configuration: launch('gpt', { effort: 'medium' }),
      },
      {
        kind: 'configured_team', address: '/divergent', team_definition_id: 'nested-def', role: null, description: null,
        team_run_id: 'nested-run', coordinator_address: '/divergent/child',
        default_launch_configuration: launch('other', { effort: 'low' }), task_executions: [],
        members: [{
          kind: 'configured_agent', address: '/divergent/child', agent_definition_id: 'child-def', role: null, description: null,
          agent_run_id: 'child-run', platform_agent_run_id: null, launch_configuration: launch('other', { effort: 'low' }),
        }],
      },
    ],
  },
})

describe('existing Team model-config draft planner', () => {
  it('propagates only through draft-start equal links and stops at divergent branches', () => {
    const updated = updateExistingTeamScopeModelConfig(
      createExistingTeamModelConfigDraft(tree()), '/', { effort: 'high' },
    )
    expect(updated.scopesByAddress['/linked']?.draftLlmConfig).toEqual({ effort: 'high' })
    expect(updated.scopesByAddress['/divergent']?.draftLlmConfig).toEqual({ effort: 'low' })
    expect(updated.scopesByAddress['/divergent/child']?.draftLlmConfig).toEqual({ effort: 'low' })
    expect(planExistingTeamModelConfigPatches(updated).map((patch) => patch.scopeAddress)).toEqual(['/', '/linked'])
  })

  it('makes a direct edit an order-independent branch boundary', () => {
    let draft = createExistingTeamModelConfigDraft(tree())
    draft = updateExistingTeamScopeModelConfig(draft, '/', { effort: 'high' })
    draft = updateExistingTeamScopeModelConfig(draft, '/linked', { effort: 'max' })
    draft = updateExistingTeamScopeModelConfig(draft, '/', { effort: 'low' })
    expect(draft.scopesByAddress['/linked']).toEqual(expect.objectContaining({
      directlyEdited: true,
      draftLlmConfig: { effort: 'max' },
    }))
    expect(planExistingTeamModelConfigPatches(draft)).toEqual([
      { scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/', llmConfig: { effort: 'low' } },
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/linked', llmConfig: { effort: 'max' } },
    ])
  })

  it('lets a direct edit before a parent change win without touching its branch', () => {
    let draft = createExistingTeamModelConfigDraft(tree())
    draft = updateExistingTeamScopeModelConfig(draft, '/linked', { effort: 'max' })
    draft = updateExistingTeamScopeModelConfig(draft, '/', { effort: 'high' })
    expect(draft.scopesByAddress['/linked']?.draftLlmConfig).toEqual({ effort: 'max' })
  })
})
