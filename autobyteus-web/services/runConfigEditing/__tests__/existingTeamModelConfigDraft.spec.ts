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
  workspace_root_path: '/workspace',
})
const tree = (): TeamRunExecutionTreeDto => ({
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
      createExistingTeamModelConfigDraft(tree()), '/', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'high' } },
    )
    expect(updated.scopesByAddress['/linked']?.draftSelection.llmConfig).toEqual({ effort: 'high' })
    expect(updated.scopesByAddress['/divergent']?.draftSelection.llmConfig).toEqual({ effort: 'low' })
    expect(planExistingTeamModelConfigPatches(updated).map((patch) => patch.scopeAddress)).toEqual(['/', '/linked'])
  })

  it('makes a direct edit an order-independent branch boundary', () => {
    let draft = createExistingTeamModelConfigDraft(tree())
    draft = updateExistingTeamScopeModelConfig(draft, '/', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'high' } })
    draft = updateExistingTeamScopeModelConfig(draft, '/linked', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'max' } })
    draft = updateExistingTeamScopeModelConfig(draft, '/', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'low' } })
    expect(draft.scopesByAddress['/linked']).toEqual(expect.objectContaining({
      directlyEdited: true,
      draftSelection: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'max' } },
    }))
    expect(planExistingTeamModelConfigPatches(draft)).toEqual([
      { scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/', runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'low' } },
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/linked', runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'max' } },
    ])
  })

  it('lets a direct edit before a parent change win without touching its branch', () => {
    let draft = createExistingTeamModelConfigDraft(tree())
    draft = updateExistingTeamScopeModelConfig(draft, '/linked', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'max' } })
    draft = updateExistingTeamScopeModelConfig(draft, '/', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'high' } })
    expect(draft.scopesByAddress['/linked']?.draftSelection.llmConfig).toEqual({ effort: 'max' })
  })
})

it('propagates the complete pair on a model-only edit and keeps defaults non-direct', () => {
  let draft = updateExistingTeamScopeModelConfig(createExistingTeamModelConfigDraft(tree()), '/', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'larger', llmConfig: null })
  expect(draft.scopesByAddress['/linked']?.draftSelection).toEqual({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'larger', llmConfig: null })
  expect(draft.scopesByAddress['/divergent']?.draftSelection.llmModelIdentifier).toBe('other')
  draft = updateExistingTeamScopeModelConfig(draft, '/linked', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'larger', llmConfig: { effort: 'medium' } }, false)
  expect(draft.scopesByAddress['/linked']?.directlyEdited).toBe(false)
  draft = updateExistingTeamScopeModelConfig(draft, '/', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'largest', llmConfig: null })
  expect(draft.scopesByAddress['/linked']?.draftSelection.llmModelIdentifier).toBe('largest')
  expect(planExistingTeamModelConfigPatches(draft)).toHaveLength(2)
})

describe('another agent runtime for a Team member (autobyteus-348)', () => {
  it('plans a member whose agent runtime changed, naming the runtime beside its model', () => {
    const draft = updateExistingTeamScopeModelConfig(
      createExistingTeamModelConfigDraft(tree()), '/divergent', { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-sonnet', llmConfig: null },
    )
    expect(draft.scopesByAddress['/divergent']?.originalSelection.runtimeKind).toBe('codex_app_server')
    expect(planExistingTeamModelConfigPatches(draft)).toEqual([
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/divergent', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-sonnet', llmConfig: null },
    ])
  })

  it('treats the same model under another agent runtime as a change, and the runtime back again as none', () => {
    const start = createExistingTeamModelConfigDraft(tree())
    const switched = updateExistingTeamScopeModelConfig(start, '/linked', { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'gpt', llmConfig: { effort: 'medium' } })
    expect(planExistingTeamModelConfigPatches(switched).map((patch) => patch.scopeAddress)).toEqual(['/linked'])
    const undone = updateExistingTeamScopeModelConfig(switched, '/linked', { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig: { effort: 'medium' } })
    expect(planExistingTeamModelConfigPatches(undone)).toEqual([])
  })

  it('carries a Team default\'s agent runtime to the members linked to it and not to a divergent one', () => {
    const draft = updateExistingTeamScopeModelConfig(
      createExistingTeamModelConfigDraft(tree()), '/', { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-sonnet', llmConfig: null },
    )
    expect(draft.scopesByAddress['/linked']?.draftSelection.runtimeKind).toBe('claude_agent_sdk')
    expect(draft.scopesByAddress['/divergent']?.draftSelection.runtimeKind).toBe('codex_app_server')
    expect(planExistingTeamModelConfigPatches(draft).map((patch) => [patch.scopeAddress, patch.runtimeKind])).toEqual([
      ['/', 'claude_agent_sdk'], ['/linked', 'claude_agent_sdk'],
    ])
  })
})
