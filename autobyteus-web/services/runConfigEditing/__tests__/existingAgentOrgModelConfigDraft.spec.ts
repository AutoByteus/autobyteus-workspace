import { describe, expect, it } from 'vitest'
import { createExistingAgentOrgModelConfigDraft, planExistingAgentOrgModelConfigPatches, updateExistingAgentOrgScopeModelConfig } from '../existingAgentOrgModelConfigDraft'

const launch = (model: string, config: Record<string, unknown> | null = { effort: 'low' }) => ({
  runtimeKind: 'codex_app_server', llmModelIdentifier: model, llmConfig: config,
  autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY', workspaceRootPath: '/workspace',
})
const tree = (overrides: Partial<Record<'root'|'direct'|'team'|'nested', ReturnType<typeof launch>>> = {}) => ({
  schemaVersion: 1, subjectKind: 'agent_org', createdAt: '2026-09-17T00:00:00Z', archivedAt: null,
  applicationBinding: null, handoffs: [], rootOrg: { address: '/', orgDefinitionId: 'org-def', orgDefinitionName: 'Org', orgRunId: 'org',
    defaultLaunchConfiguration: overrides.root ?? launch('root'), taskExecutions: [], members: [
      { address: '/direct', agentDefinitionId: 'a', role: 'Direct', description: null, agentRunId: 'direct', platformAgentRunId: null,
        launchConfiguration: overrides.direct ?? launch('root') },
      { address: '/team', teamDefinitionId: 't', role: 'Team', description: null, teamRunId: 'team', coordinatorAddress: '/team/worker', taskExecutions: [],
        defaultLaunchConfiguration: overrides.team ?? launch('root'), members: [
          { address: '/team/worker', agentDefinitionId: 'w', role: 'Worker', description: null, agentRunId: 'worker', platformAgentRunId: null,
            launchConfiguration: overrides.nested ?? launch('root') },
        ] },
    ] },
}) as any

describe('existing AgentOrg hierarchical model-config draft', () => {
  it('recursively propagates root edits through linked direct/Team/nested scopes', () => {
    let draft = createExistingAgentOrgModelConfigDraft(tree())
    draft = updateExistingAgentOrgScopeModelConfig(draft, '/', { llmModelIdentifier: 'larger', llmConfig: { effort: 'high' } })
    expect(Object.values(draft.scopesByAddress).map(scope => scope.draftSelection.llmModelIdentifier)).toEqual(['larger','larger','larger','larger'])
    expect(planExistingAgentOrgModelConfigPatches(draft).map(patch => patch.scopeAddress)).toEqual(['/','/direct','/team','/team/worker'])
  })

  it('preserves pre-existing and directly edited overrides while continuing linked branches', () => {
    let draft = createExistingAgentOrgModelConfigDraft(tree({ direct: launch('direct') }))
    draft = updateExistingAgentOrgScopeModelConfig(draft, '/team/worker', { llmModelIdentifier: 'worker', llmConfig: null })
    draft = updateExistingAgentOrgScopeModelConfig(draft, '/', { llmModelIdentifier: 'larger', llmConfig: { effort: 'medium' } })
    expect(draft.scopesByAddress['/direct']!.draftSelection.llmModelIdentifier).toBe('direct')
    expect(draft.scopesByAddress['/team']!.draftSelection.llmModelIdentifier).toBe('larger')
    expect(draft.scopesByAddress['/team/worker']!.draftSelection).toEqual({ llmModelIdentifier: 'worker', llmConfig: null })
  })

  it('propagates a mounted-Team edit only to its linked Agents and preserves explicit zero/false/null values', () => {
    let draft = createExistingAgentOrgModelConfigDraft(tree())
    draft = updateExistingAgentOrgScopeModelConfig(draft, '/team', { llmModelIdentifier: 'team-model', llmConfig: { budget: 0, enabled: false, optional: null } })
    expect(draft.scopesByAddress['/direct']!.draftSelection.llmModelIdentifier).toBe('root')
    expect(draft.scopesByAddress['/team/worker']!.draftSelection.llmConfig).toEqual({ budget: 0, enabled: false, optional: null })
  })
})
