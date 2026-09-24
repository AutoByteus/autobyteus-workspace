import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AgentOrgDefinition } from '../agentOrgDefinitionStore'
import type { AgentTeamDefinition } from '../agentTeamDefinitionStore'
import type { ResolvedTeamRunLaunchConfig } from '~/types/agent/TeamRunConfig'
import { projectEditableAgentOrgRunFormModel } from '~/utils/editableAgentOrgRunFormModel'
import { useAgentOrgRunConfigStore } from '../agentOrgRunConfigStore'

const org: AgentOrgDefinition = {
  id: 'org-1', name: 'Org', description: '', instructions: '', revision: '1', handoffs: [],
  members: [{ memberName: 'software', ref: 'team-1', refType: 'AGENT_TEAM', refScope: 'SHARED' }],
}
const team: AgentTeamDefinition = {
  id: 'team-1', name: 'Software', description: '', instructions: '',
  coordinatorMemberName: 'worker', nodes: [{ memberName: 'worker', ref: 'agent-1' }],
}
const rootConfig: ResolvedTeamRunLaunchConfig = {
  runtimeKind: 'autobyteus', workspaceId: 'workspace-1',
  workspaceMetadata: { workspaceId: 'workspace-1', workspaceRootPath: '/workspace', displayName: 'Workspace', kind: 'filesystem' },
  workspaceRootPath: '/workspace', llmModelIdentifier: 'gpt-root', llmConfig: null,
  autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY',
}
const effectiveOrg = (store: ReturnType<typeof useAgentOrgRunConfigStore>) => {
  const projection = projectEditableAgentOrgRunFormModel({
    orgDefinition: org, rootConfig,
    teamOverrides: store.intent.teamOverrides, agentOverrides: store.intent.agentOverrides,
    getTeamDefinitionById: (id) => id === team.id ? team : null,
    getAgentDisplayNameById: () => null,
    workspaceSelectionFor: () => ({ mode: 'existing', existingWorkspaceId: 'workspace-1', newWorkspacePath: '' }),
    workspaceOperationFor: () => ({ status: 'idle', error: null }),
    runtimeCatalogStateFor: () => ({ status: 'idle', error: null }),
  })
  if (projection.status !== 'ready') throw new Error(projection.diagnostic.message)
  return projection.model.mountedTeams[0]!
}

describe('agentOrgRunConfigStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('owns separate exact Team and Agent sparse patches', () => {
    const store = useAgentOrgRunConfigStore()
    store.begin({ definitionId: 'org-1', runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-root' })
    store.setTeamOverride('/software', { runtimeKind: 'codex_app_server' })
    store.setAgentOverride('/software/worker', { llmModelIdentifier: 'gpt-worker' })

    expect(store.intent.teamOverrides).toEqual({ '/software': { runtimeKind: 'codex_app_server', llmConfig: null } })
    expect(store.intent.agentOverrides).toEqual({ '/software/worker': { llmModelIdentifier: 'gpt-worker', llmConfig: null } })
    expect(store.intent).not.toHaveProperty('memberOverrides')
  })

  it('defaults a newly selected Org Team AGY scope on, then preserves an explicit off edit', () => {
    const store = useAgentOrgRunConfigStore()
    store.begin({ definitionId: 'org-1', runtimeKind: 'autobyteus' })

    store.setTeamOverride('/software', { runtimeKind: 'antigravity_cli' })
    expect(store.intent.teamOverrides['/software']).toMatchObject({ runtimeKind: 'antigravity_cli', autoExecuteTools: true })
    expect(effectiveOrg(store).scope.effectiveConfig.autoExecuteTools).toBe(true)
    expect(effectiveOrg(store).children[0]!.effectiveConfig.autoExecuteTools).toBe(true)

    store.setTeamOverride('/software', { runtimeKind: 'antigravity_cli', autoExecuteTools: false })
    expect(store.intent.teamOverrides['/software']?.autoExecuteTools).toBe(false)
    expect(effectiveOrg(store).scope.effectiveConfig.autoExecuteTools).toBe(false)
    expect(effectiveOrg(store).children[0]!.effectiveConfig.autoExecuteTools).toBe(false)
  })

  it('preserves an explicit-off edit after selecting AGY for an Org Agent', () => {
    const store = useAgentOrgRunConfigStore()
    store.begin({ definitionId: 'org-1', runtimeKind: 'autobyteus' })

    store.setAgentOverride('/software/worker', { runtimeKind: 'antigravity_cli' })
    expect(store.intent.agentOverrides['/software/worker']).toMatchObject({ runtimeKind: 'antigravity_cli', autoExecuteTools: true })
    expect(effectiveOrg(store).children[0]!.effectiveConfig.autoExecuteTools).toBe(true)

    store.setAgentOverride('/software/worker', { runtimeKind: 'antigravity_cli', autoExecuteTools: false })
    expect(store.intent.agentOverrides['/software/worker']?.autoExecuteTools).toBe(false)
    expect(effectiveOrg(store).children[0]!.effectiveConfig.autoExecuteTools).toBe(false)
    expect(effectiveOrg(store).scope.effectiveConfig.autoExecuteTools).toBe(false)
  })

  it('resets only the exact Team patch and its workspace authoring state', () => {
    const store = useAgentOrgRunConfigStore()
    store.begin({ definitionId: 'org-1' })
    store.setTeamOverride('/software', {
      workspace: { workspaceId: null, workspaceMetadata: null },
      autoExecuteTools: true,
    })
    store.setTeamWorkspaceSelection('/software', {
      mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/software',
    })
    store.setTeamWorkspaceOperation('/software', { status: 'error', error: 'unavailable' })
    store.setAgentOverride('/software/worker', { autoExecuteTools: true })

    store.resetTeamOverride('/software')

    expect(store.teamOverrides).toEqual({})
    expect(store.teamWorkspaceSelections).toEqual({})
    expect(store.teamWorkspaceOperations).toEqual({})
    expect(store.agentOverrides).toEqual({ '/software/worker': { autoExecuteTools: true } })
  })

  it('starts a different Org draft from a clean sparse configuration', () => {
    const store = useAgentOrgRunConfigStore()
    store.begin({ definitionId: 'org-1' })
    store.setTeamOverride('/software', { autoExecuteTools: true })
    store.setAgentOverride('/direct', { autoExecuteTools: true })
    store.setProjectionError('projection unavailable')
    store.setLaunchError('launch unavailable')
    store.setTeamWorkspaceSelection('/software', {
      mode: 'existing', existingWorkspaceId: 'workspace-1', newWorkspacePath: '',
    })

    store.begin({ definitionId: 'org-2', runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-next' })

    expect(store.definitionId).toBe('org-2')
    expect(store.teamOverrides).toEqual({})
    expect(store.agentOverrides).toEqual({})
    expect(store.teamWorkspaceSelections).toEqual({})
    expect(store.workspaceSelection).toEqual({ mode: 'new', existingWorkspaceId: null, newWorkspacePath: '' })
    expect(store.projectionError).toBeNull()
    expect(store.launchError).toBeNull()
    expect(store.modelSchemaScopeAddresses).toEqual(['/'])
    expect(store.firstModelSchemaBlock).toEqual({
      address: '/', state: { status: 'loading', message: null },
    })
  })

  it('starts a fresh epoch for the same Org while preserving one epoch across retries', () => {
    const store = useAgentOrgRunConfigStore()
    store.begin({ definitionId: 'org-1', llmModelIdentifier: 'gpt-root' })
    const firstEpoch = store.draftEpoch
    expect(store.selectDefaultRootWorkspace('temp-workspace')).toBe(true)
    expect(store.rootWorkspaceSelectionSource).toBe('defaulted')

    store.setWorkspaceSelection({
      mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/explicit/root',
    })
    expect(store.selectDefaultRootWorkspace('replacement-temp')).toBe(false)
    expect(store.workspaceSelection.newWorkspacePath).toBe('/explicit/root')

    store.begin({ definitionId: 'org-1', llmModelIdentifier: 'gpt-root' })
    expect(store.draftEpoch).toBe(firstEpoch + 1)
    expect(store.rootWorkspaceSelectionSource).toBe('untouched')
    expect(store.workspaceSelection).toEqual({
      mode: 'new', existingWorkspaceId: null, newWorkspacePath: '',
    })
    expect(store.selectDefaultRootWorkspace('replacement-temp')).toBe(true)
    expect(store.workspaceSelection).toEqual({
      mode: 'existing', existingWorkspaceId: 'replacement-temp', newWorkspacePath: '',
    })
  })

  it('keeps the root tuple coherent and isolated from later input mutation', () => {
    const store = useAgentOrgRunConfigStore()
    const nested = { z: [{ beta: 2, alpha: 1 }] }
    store.begin({ definitionId: 'org-1', llmConfig: nested })
    nested.z[0]!.alpha = 99
    expect(store.llmConfig).toEqual({ z: [{ alpha: 1, beta: 2 }] })

    store.setRootRuntimeKind('codex_app_server')
    expect(store.llmConfig).toBeNull()
    store.setRootLlmConfig({ effort: 'high' })
    store.setRootLlmModelIdentifier('gpt-next')
    expect(store.llmConfig).toBeNull()
  })

  it('retains exact schema readiness and prunes state outside the projected Org scope', () => {
    const store = useAgentOrgRunConfigStore()
    store.begin({ definitionId: 'org-1' })
    store.reconcileModelSchemaScopes(['/', '/software', '/software/worker', '/direct'])

    store.setModelSchemaState('/', { status: 'ready', message: null })
    store.setModelSchemaState('/software', { status: 'invalid', message: 'Value must be at least 1.' })
    store.setModelSchemaState('/software/worker', { status: 'ready', message: null })
    store.setModelSchemaState('/direct', { status: 'unavailable', message: 'Model options could not be loaded.' })

    expect(store.allModelSchemaScopesReady).toBe(false)
    expect(store.firstModelSchemaBlock).toEqual({
      address: '/software',
      state: { status: 'invalid', message: 'Value must be at least 1.' },
    })

    store.setModelSchemaState('/software', { status: 'ready', message: null })
    expect(store.firstModelSchemaBlock).toEqual({
      address: '/direct',
      state: { status: 'unavailable', message: 'Model options could not be loaded.' },
    })
    store.setModelSchemaState('/direct', { status: 'ready', message: null })
    expect(store.allModelSchemaScopesReady).toBe(true)

    store.reconcileModelSchemaScopes(['/', '/direct'])
    expect(store.modelSchemaStateByAddress).toEqual({
      '/': { status: 'ready', message: null },
      '/direct': { status: 'ready', message: null },
    })
    store.setModelSchemaState('/software', { status: 'invalid', message: 'stale' })
    expect(store.modelSchemaStateByAddress).not.toHaveProperty('/software')
  })
})
