import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'

const definition = (nodes: AgentTeamDefinition['nodes'] = [
  { memberName: 'teacher', ref: 'teacher-def' },
  { memberName: 'reviewer', ref: 'reviewer-def' },
  { memberName: 'worker', ref: 'worker-def' },
]): AgentTeamDefinition => ({
  id: 'root-def',
  name: 'Flat Team',
  description: '',
  instructions: '',
  coordinatorMemberName: 'teacher',
  nodes,
  defaultLaunchConfig: {
    runtimeKind: 'codex_app_server',
    llmModelIdentifier: 'gpt-5.6-luna',
    llmConfig: { reasoning_effort: 'medium' },
  },
})

const workspace = {
  workspaceId: 'ws-root',
  workspaceMetadata: {
    workspaceId: 'ws-root',
    workspaceRootPath: '/workspace/root',
    displayName: 'root',
    kind: 'filesystem' as const,
  },
}

const flatConfig = (): TeamRunConfig => ({
  teamDefinitionId: 'root-def',
  teamDefinitionName: 'Flat Team',
  rootConfig: {
    runtimeKind: 'codex_app_server',
    workspace,
    llmModelIdentifier: 'gpt-5.6-luna',
    llmConfig: { reasoning_effort: 'medium' },
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
  },
  teamOverrides: {},
  agentOverrides: {
    '/reviewer': {
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-sonnet',
      llmConfig: { temperature: 0.3 },
    },
  },
  isLocked: false,
})

const configureCatalogs = (store: ReturnType<typeof useTeamRunConfigStore>): void => {
  store.setRuntimeModelCatalog('codex_app_server', ['gpt-5.6-luna', 'gpt-5.4'])
  store.setRuntimeModelCatalog('claude_agent_sdk', ['claude-sonnet'])
}

describe('teamRunConfigStore flat Team launch intent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAgentTeamDefinitionStore().agentTeamDefinitions = [definition()]
  })

  it('seeds one root Team with direct Agents and immutable launch intent', () => {
    const store = useTeamRunConfigStore()
    store.setTemplate(definition())

    expect(store.config).toEqual(expect.objectContaining({
      teamDefinitionId: 'root-def',
      rootConfig: expect.objectContaining({
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'gpt-5.6-luna',
        llmConfig: { reasoning_effort: 'medium' },
      }),
      teamOverrides: {},
      agentOverrides: {},
    }))
    expect(store.memberTree?.map((member) => member.address)).toEqual(['/teacher', '/reviewer', '/worker'])
    expect(store.memberTree?.every((member) => member.kind === 'agent')).toBe(true)
    expect(Object.isFrozen(store.config)).toBe(true)
  })

  it('applies root and direct-Agent edits while rejecting every configured Team placement', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(flatConfig())
    const initial = store.config

    store.applyConfigEdit({ kind: 'set_root_model', llmModelIdentifier: 'gpt-5.4' })
    store.applyConfigEdit({
      kind: 'set_agent_override',
      agentAddress: '/worker',
      override: { autoExecuteTools: true },
    })

    expect(store.config).not.toBe(initial)
    expect(store.config?.rootConfig.llmModelIdentifier).toBe('gpt-5.4')
    expect(store.config?.agentOverrides['/worker']).toEqual({ autoExecuteTools: true })
    expect(() => store.applyConfigEdit({
      kind: 'set_team_override', teamAddress: '/reviewer', override: { autoExecuteTools: true },
    })).toThrow("Address '/reviewer' is not an exact Team placement.")
    expect(() => store.applyConfigEdit({
      kind: 'set_agent_override', agentAddress: '/missing', override: { autoExecuteTools: true },
    })).toThrow("Address '/missing' is not an exact Agent placement.")
  })

  it('prunes stale Agent llmConfig when the root runtime/model baseline changes', () => {
    const store = useTeamRunConfigStore()
    const config = flatConfig()
    config.agentOverrides['/worker'] = { llmConfig: { inherited_schema: true } }
    store.setConfig(config)

    store.applyConfigEdit({ kind: 'set_root_model', llmModelIdentifier: 'gpt-5.4' })

    expect(store.config?.agentOverrides['/worker']).toBeUndefined()
    expect(store.config?.agentOverrides['/reviewer']).toEqual({
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-sonnet',
      llmConfig: { temperature: 0.3 },
    })
  })

  it('reconciles removed and invalid direct-Agent overrides visibly before launch', () => {
    const store = useTeamRunConfigStore()
    const stale = flatConfig()
    stale.agentOverrides['/removed'] = { llmModelIdentifier: 'old' }
    stale.teamOverrides['/reviewer'] = { llmModelIdentifier: 'wrong-kind' }
    store.setConfig(stale)

    const result = store.reconcileSelectedDraftTopology(store.memberTree!)

    expect(result).toEqual(expect.objectContaining({
      repaired: true,
      addresses: ['/removed', '/reviewer'],
    }))
    expect(store.config?.agentOverrides['/removed']).toBeUndefined()
    expect(store.config?.teamOverrides).toEqual({})
    expect(store.repairNotice?.addresses).toEqual(['/removed', '/reviewer'])
  })

  it('validates the root and each direct Agent while owning workspace readiness only at root', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(flatConfig())
    configureCatalogs(store)

    expect(store.launchReadiness).toEqual(expect.objectContaining({ canLaunch: true, blockingIssues: [] }))

    store.setRuntimeModelCatalog('claude_agent_sdk', [])
    expect(store.launchReadiness.blockingIssues).toContainEqual(expect.objectContaining({
      code: 'MODEL_UNAVAILABLE', subjectAddress: '/reviewer',
    }))

    const noWorkspace = flatConfig()
    noWorkspace.rootConfig.workspace = { workspaceId: null, workspaceMetadata: null }
    store.setConfig(noWorkspace)
    configureCatalogs(store)
    expect(store.launchReadiness.blockingIssues
      .filter((issue) => issue.code === 'WORKSPACE_REQUIRED')
      .map((issue) => issue.subjectAddress)).toEqual(['/'])
  })

  it('plans one root workspace creation and locks the exact draft until cancellation', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(flatConfig())
    const draft = store.selectedDraft!
    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: draft.draftId, teamAddress: '/',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/new-root' },
    })

    const result = store.reconcileAndPlanSelectedDraftLaunch(store.selectedDraft!, store.memberTree!)

    expect(result.status).toBe('planned')
    if (result.status !== 'planned') throw new Error('Expected a workspace preparation plan.')
    expect(result.plan.requests).toEqual([{ rootPath: '/workspace/new-root', teamAddresses: ['/'] }])
    expect(() => store.focusMember('/worker')).toThrow(/in flight/)
    store.cancelWorkspacePreparation(result.plan)
    expect(store.hasInFlightLaunch).toBe(false)
  })

  it('repairs removed direct Agents when topology changes during root workspace preparation', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(flatConfig())
    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: store.selectedDraft!.draftId, teamAddress: '/',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/new-root' },
    })
    const planned = store.reconcileAndPlanSelectedDraftLaunch(store.selectedDraft!, store.memberTree!)
    if (planned.status !== 'planned') throw new Error('Expected a workspace preparation plan.')
    useAgentTeamDefinitionStore().agentTeamDefinitions = [definition([
      { memberName: 'teacher', ref: 'teacher-def' },
    ])]

    const result = store.stopStaleWorkspacePreparation(planned.plan, store.memberTree!)

    expect(result.addresses).toEqual(['/reviewer', '/worker'])
    expect(store.config?.agentOverrides).toEqual({})
    expect(store.repairNotice?.addresses).toEqual(['/reviewer', '/worker'])
    expect(store.teamWorkspaceAuthoringViewFor('/').selection.newWorkspacePath).toBe('/workspace/new-root')
  })

  it('isolates root workspace buffers by draft identity and clears only the selected draft', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(flatConfig())
    const firstId = store.selectedDraft!.draftId
    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: firstId, teamAddress: '/',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/first' },
    })
    store.setConfig(flatConfig())
    const secondId = store.selectedDraft!.draftId

    expect(secondId).not.toBe(firstId)
    expect(store.teamWorkspaceAuthoringViewFor('/').selection.mode).toBe('existing')
    store.selectDraft(firstId)
    expect(store.teamWorkspaceAuthoringViewFor('/').selection.newWorkspacePath).toBe('/workspace/first')
    store.clearConfig()
    expect(store.config).toBeNull()
    store.selectDraft(secondId)
    expect(store.config?.teamDefinitionId).toBe('root-def')
  })
})
