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
        kind: 'configured_agent', address: '/divergent', agent_definition_id: 'divergent-def', role: null, description: null,
        agent_run_id: 'divergent-run', platform_agent_run_id: null, launch_configuration: launch('other', { effort: 'low' }),
      },
    ],
  },
})

describe('existing Team model-config draft planner', () => {
  it('propagates only through draft-start equal links and stops at divergent branches', () => {
    const updated = updateExistingTeamScopeModelConfig(
      createExistingTeamModelConfigDraft(tree()), '/', { llmModelIdentifier: 'gpt', llmConfig: { effort: 'high' } },
    )
    expect(updated.scopesByAddress['/linked']?.draftSelection.llmConfig).toEqual({ effort: 'high' })
    expect(updated.scopesByAddress['/divergent']?.draftSelection.llmConfig).toEqual({ effort: 'low' })
    expect(planExistingTeamModelConfigPatches(updated).map((patch) => patch.scopeAddress)).toEqual(['/', '/linked'])
  })

  it('makes a direct edit an order-independent branch boundary', () => {
    let draft = createExistingTeamModelConfigDraft(tree())
    draft = updateExistingTeamScopeModelConfig(draft, '/', { llmModelIdentifier: 'gpt', llmConfig: { effort: 'high' } })
    draft = updateExistingTeamScopeModelConfig(draft, '/linked', { llmModelIdentifier: 'gpt', llmConfig: { effort: 'max' } })
    draft = updateExistingTeamScopeModelConfig(draft, '/', { llmModelIdentifier: 'gpt', llmConfig: { effort: 'low' } })
    expect(draft.scopesByAddress['/linked']).toEqual(expect.objectContaining({
      directlyEdited: true,
      draftSelection: { llmModelIdentifier: 'gpt', llmConfig: { effort: 'max' } },
    }))
    expect(planExistingTeamModelConfigPatches(draft)).toEqual([
      { scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/', llmModelIdentifier: 'gpt', llmConfig: { effort: 'low' } },
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/linked', llmModelIdentifier: 'gpt', llmConfig: { effort: 'max' } },
    ])
  })

  it('lets a direct edit before a parent change win without touching its branch', () => {
    let draft = createExistingTeamModelConfigDraft(tree())
    draft = updateExistingTeamScopeModelConfig(draft, '/linked', { llmModelIdentifier: 'gpt', llmConfig: { effort: 'max' } })
    draft = updateExistingTeamScopeModelConfig(draft, '/', { llmModelIdentifier: 'gpt', llmConfig: { effort: 'high' } })
    expect(draft.scopesByAddress['/linked']?.draftSelection.llmConfig).toEqual({ effort: 'max' })
  })

  it('adapts nested configured Teams to the shared recursive policy without crossing a direct-edit boundary', () => {
    const base = tree()
    const nested: TeamRunExecutionTreeDto = { ...base, root_team: { ...base.root_team, members: [{
      kind: 'configured_team', address: '/group', team_definition_id: 'group-def', role: null, description: null,
      team_run_id: 'group-run', coordinator_address: '/group/member',
      default_launch_configuration: launch('gpt', { effort: 'medium' }), task_executions: [],
      members: [{
        kind: 'configured_agent', address: '/group/member', agent_definition_id: 'member-def', role: null, description: null,
        agent_run_id: 'member-run', platform_agent_run_id: null,
        launch_configuration: launch('gpt', { effort: 'medium' }),
      }],
    }] } }
    let draft = createExistingTeamModelConfigDraft(nested)
    draft = updateExistingTeamScopeModelConfig(draft, '/group/member', {
      llmModelIdentifier: 'member-model', llmConfig: { budget: 0, enabled: false },
    })
    draft = updateExistingTeamScopeModelConfig(draft, '/', {
      llmModelIdentifier: 'root-next', llmConfig: null,
    })
    expect(draft.scopesByAddress['/group']?.draftSelection).toEqual({ llmModelIdentifier: 'root-next', llmConfig: null })
    expect(draft.scopesByAddress['/group/member']?.draftSelection).toEqual({
      llmModelIdentifier: 'member-model', llmConfig: { budget: 0, enabled: false },
    })
  })
})

it('propagates the complete pair on a model-only edit and keeps defaults non-direct', () => {
  let draft = updateExistingTeamScopeModelConfig(createExistingTeamModelConfigDraft(tree()), '/', { llmModelIdentifier: 'larger', llmConfig: null })
  expect(draft.scopesByAddress['/linked']?.draftSelection).toEqual({ llmModelIdentifier: 'larger', llmConfig: null })
  expect(draft.scopesByAddress['/divergent']?.draftSelection.llmModelIdentifier).toBe('other')
  draft = updateExistingTeamScopeModelConfig(draft, '/linked', { llmModelIdentifier: 'larger', llmConfig: { effort: 'medium' } }, false)
  expect(draft.scopesByAddress['/linked']?.directlyEdited).toBe(false)
  draft = updateExistingTeamScopeModelConfig(draft, '/', { llmModelIdentifier: 'largest', llmConfig: null })
  expect(draft.scopesByAddress['/linked']?.draftSelection.llmModelIdentifier).toBe('largest')
  expect(planExistingTeamModelConfigPatches(draft)).toHaveLength(2)
})
