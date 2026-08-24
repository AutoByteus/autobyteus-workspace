import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'

const definition = (
  id: string,
  coordinatorMemberName: string,
  nodes: AgentTeamDefinition['nodes'],
): AgentTeamDefinition => ({
  id,
  name: id,
  description: '',
  instructions: '',
  coordinatorMemberName,
  nodes,
  defaultLaunchConfig: id === 'root-def'
    ? {
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'gpt-5.6-luna',
        llmConfig: { reasoning_effort: 'medium' },
      }
    : {
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'definition-default-must-not-activate',
        llmConfig: { ignored: true },
      },
})

const definitions = [
  definition('root-def', 'teacher', [
    { memberName: 'teacher', ref: 'teacher-def', refType: 'AGENT' },
    { memberName: 'Research', ref: 'research-def', refType: 'AGENT_TEAM' },
    { memberName: 'Sibling', ref: 'sibling-def', refType: 'AGENT_TEAM' },
  ]),
  definition('research-def', 'lead', [
    { memberName: 'lead', ref: 'lead-def', refType: 'AGENT' },
    { memberName: 'Study', ref: 'study-def', refType: 'AGENT_TEAM' },
  ]),
  definition('study-def', 'student', [
    { memberName: 'student', ref: 'student-def', refType: 'AGENT' },
  ]),
  definition('sibling-def', 'worker', [
    { memberName: 'worker', ref: 'worker-def', refType: 'AGENT' },
  ]),
]

const workspace = {
  workspaceId: 'ws-root',
  workspaceMetadata: {
    workspaceId: 'ws-root',
    workspaceRootPath: '/workspace/root',
    displayName: 'root',
    kind: 'filesystem' as const,
  },
}

const hierarchicalConfig = (): TeamRunConfig => ({
  teamDefinitionId: 'root-def',
  teamDefinitionName: 'root-def',
  rootConfig: {
    runtimeKind: 'codex_app_server',
    workspace,
    llmModelIdentifier: 'gpt-5.6-luna',
    llmConfig: { reasoning_effort: 'medium' },
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
  },
  teamOverrides: {
    '/Research': {
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-sonnet',
      llmConfig: { temperature: 0.1 },
    },
    '/Research/Study': {
      llmModelIdentifier: 'claude-opus',
      llmConfig: { temperature: 0.2 },
    },
  },
  agentOverrides: {
    '/Research/Study/student': {
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-opus-student',
      llmConfig: { temperature: 0.3 },
    },
  },
  isLocked: false,
})

describe('teamRunConfigStore hierarchical launch intent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAgentTeamDefinitionStore().agentTeamDefinitions = definitions
  })

  it('seeds only the selected root definition and stores immutable root/Team/Agent intent', () => {
    const store = useTeamRunConfigStore()
    store.setTemplate(definitions[0]!)

    expect(store.config).toEqual(expect.objectContaining({
      teamDefinitionId: 'root-def',
      rootConfig: expect.objectContaining({
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'gpt-5.6-luna',
        llmConfig: { reasoning_effort: 'medium' },
      }),
      teamOverrides: {},
      agentOverrides: {},
      isLocked: false,
    }))
    expect(Object.isFrozen(store.config)).toBe(true)
    expect(Object.isFrozen(store.config?.rootConfig.llmConfig)).toBe(true)
  })

  it('applies root, Team, reset, and Agent edits through immutable replacement and rejects wrong-kind targets', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(hierarchicalConfig())
    const initial = store.config

    store.applyConfigEdit({
      kind: 'set_team_override',
      teamAddress: '/Research',
      override: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'claude-haiku' },
    })
    expect(store.config?.teamOverrides['/Research']).toEqual({
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-haiku',
    })
    expect(store.config).not.toBe(initial)
    expect(Object.isFrozen(store.config)).toBe(true)

    store.applyConfigEdit({ kind: 'reset_team_override', teamAddress: '/Research' })
    expect(store.config?.teamOverrides['/Research']).toBeUndefined()

    store.applyConfigEdit({
      kind: 'set_agent_override',
      agentAddress: '/Research/lead',
      override: { autoExecuteTools: true },
    })
    expect(store.config?.agentOverrides['/Research/lead']).toEqual({ autoExecuteTools: true })

    expect(() => store.applyConfigEdit({
      kind: 'set_team_override',
      teamAddress: '/Research/lead',
      override: { autoExecuteTools: true },
    })).toThrow("Address '/Research/lead' is not an exact Team placement.")
    expect(() => store.applyConfigEdit({
      kind: 'set_agent_override',
      agentAddress: '/Research',
      override: { autoExecuteTools: true },
    })).toThrow("Address '/Research' is not an exact Agent placement.")
  })

  it('prunes descendant llmConfig only where a parent Team edit changes effective runtime/model', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(hierarchicalConfig())

    store.applyConfigEdit({
      kind: 'set_team_override',
      teamAddress: '/Research',
      override: {
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'claude-haiku',
        llmConfig: { stale: true },
      },
    })

    expect(store.config?.teamOverrides['/Research']).toEqual({
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-haiku',
    })
    expect(store.config?.teamOverrides['/Research/Study']).toEqual({
      llmModelIdentifier: 'claude-opus',
      llmConfig: { temperature: 0.2 },
    })
    expect(store.config?.agentOverrides['/Research/Study/student']).toEqual({
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-opus-student',
      llmConfig: { temperature: 0.3 },
    })
  })

  it('reset recomputes descendants, removes newly incompatible configs, and preserves an independently pinned Agent', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(hierarchicalConfig())

    store.applyConfigEdit({ kind: 'reset_team_override', teamAddress: '/Research' })

    expect(store.config?.teamOverrides['/Research']).toBeUndefined()
    expect(store.config?.teamOverrides['/Research/Study']).toEqual({
      llmModelIdentifier: 'claude-opus',
    })
    expect(store.config?.agentOverrides['/Research/Study/student']).toEqual({
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-opus-student',
      llmConfig: { temperature: 0.3 },
    })
  })

  it('reconciles stale and kind-mismatched intent visibly and refuses mutation while preparing', () => {
    const store = useTeamRunConfigStore()
    const stale = hierarchicalConfig()
    stale.teamOverrides['/removed'] = { llmModelIdentifier: 'old' }
    stale.agentOverrides['/Research'] = { llmModelIdentifier: 'wrong-kind' }
    store.setConfig(stale)

    const result = store.reconcileSelectedDraftTopology(store.memberTree!)

    expect(result).toEqual(expect.objectContaining({
      repaired: true,
      addresses: ['/Research', '/removed'],
    }))
    expect(store.repairNotice?.addresses).toEqual(['/Research', '/removed'])
    expect(store.config?.teamOverrides['/removed']).toBeUndefined()
    expect(store.config?.agentOverrides['/Research']).toBeUndefined()

    const admitted = store.selectedDraft!
    const preparation = store.reconcileAndPlanSelectedDraftLaunch(admitted, store.memberTree!)
    expect(preparation.status).toBe('planned')
    expect(() => store.applyConfigEdit({
      kind: 'set_root_model',
      llmModelIdentifier: 'other',
    })).toThrow(/in flight/)
    expect(() => store.reconcileSelectedDraftTopology(store.memberTree!)).toThrow(/in flight/)
    if (preparation.status === 'planned') store.cancelWorkspacePreparation(preparation.plan)
  })

  it('validates every effective runtime/model and draft-owned address-scoped workspace state', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(hierarchicalConfig())
    store.setRuntimeModelCatalog('codex_app_server', ['gpt-5.6-luna'])
    store.setRuntimeModelCatalog('claude_agent_sdk', ['claude-sonnet', 'claude-opus', 'claude-opus-student'])

    expect(store.launchReadiness).toEqual(expect.objectContaining({
      canLaunch: true,
      blockingIssues: [],
    }))

    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: store.selectedDraft!.draftId, teamAddress: '/Research',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/research-new' },
    })
    expect(store.teamWorkspaceAuthoringViewFor('/Research')).toEqual(expect.objectContaining({
      selection: expect.objectContaining({ mode: 'new', newWorkspacePath: '/workspace/research-new' }),
      operation: { status: 'idle', error: null },
    }))

    store.setRuntimeModelCatalog('claude_agent_sdk', ['claude-sonnet'])
    expect(store.launchReadiness.canLaunch).toBe(false)
    expect(store.launchReadiness.blockingIssues.map((issue) => issue.subjectAddress)).toEqual(
      expect.arrayContaining(['/Research/Study', '/Research/Study/student']),
    )
  })

  it('reports missing workspaces only at the Team scope that owns the inherited selection', () => {
    const store = useTeamRunConfigStore()
    const missingRoot = hierarchicalConfig()
    missingRoot.rootConfig.workspace = { workspaceId: null, workspaceMetadata: null }
    store.setConfig(missingRoot)
    store.setRuntimeModelCatalog('codex_app_server', ['gpt-5.6-luna'])
    store.setRuntimeModelCatalog('claude_agent_sdk', ['claude-sonnet', 'claude-opus', 'claude-opus-student'])

    expect(store.launchReadiness.blockingIssues
      .filter((issue) => issue.code === 'WORKSPACE_REQUIRED')
      .map((issue) => issue.subjectAddress)).toEqual(['/'])

    const missingNested = hierarchicalConfig()
    missingNested.teamOverrides['/Research'] = {
      ...missingNested.teamOverrides['/Research'],
      workspace: { workspaceId: null, workspaceMetadata: null },
    }
    store.setConfig(missingNested)

    expect(store.launchReadiness.blockingIssues
      .filter((issue) => issue.code === 'WORKSPACE_REQUIRED')
      .map((issue) => issue.subjectAddress)).toEqual(['/Research'])
  })

  it('clears the selected draft together with its owned transient workspace state', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(hierarchicalConfig())
    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: store.selectedDraft!.draftId, teamAddress: '/Research',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/research-new' },
    })
    store.clearConfig()

    expect(store.config).toBeNull()
    expect(store.repairNotice).toBeNull()
  })

  it('prunes removed/kind-changed Team config and active/inactive buffers while preserving root authoring', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(hierarchicalConfig())
    const draftId = store.selectedDraft!.draftId
    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId, teamAddress: '/',
      selection: { mode: 'new', existingWorkspaceId: 'ws-root', newWorkspacePath: '/workspace/root-new' },
    })
    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId, teamAddress: '/Research',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/research-new' },
    })
    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId, teamAddress: '/Research',
      selection: { mode: 'existing', existingWorkspaceId: null, newWorkspacePath: '/ignored-by-command' },
    })
    useAgentTeamDefinitionStore().agentTeamDefinitions = [
      definition('root-def', 'teacher', [
        { memberName: 'teacher', ref: 'teacher-def', refType: 'AGENT' },
        { memberName: 'Research', ref: 'replacement-agent-def', refType: 'AGENT' },
        { memberName: 'Sibling', ref: 'sibling-def', refType: 'AGENT_TEAM' },
      ]),
      ...definitions.filter((item) => item.id === 'sibling-def'),
    ]

    const result = store.reconcileSelectedDraftTopology(store.memberTree!)

    expect(result.repaired).toBe(true)
    expect(result.addresses).toEqual(['/Research', '/Research/Study', '/Research/Study/student'])
    expect(store.selectedDraft!.teamWorkspaceAuthoringByTeamAddress['/Research']).toBeUndefined()
    expect(store.teamWorkspaceAuthoringViewFor('/').selection).toMatchObject({
      mode: 'new', newWorkspacePath: '/workspace/root-new',
    })
    expect(store.config?.teamOverrides['/Research']).toBeUndefined()
  })

  it.each([
    {
      change: 'rename',
      nextDefinitions: () => [
        definition('root-def', 'teacher', [
          { memberName: 'teacher', ref: 'teacher-def', refType: 'AGENT' },
          { memberName: 'Investigation', ref: 'research-def', refType: 'AGENT_TEAM' },
          { memberName: 'Sibling', ref: 'sibling-def', refType: 'AGENT_TEAM' },
        ]),
        ...definitions.slice(1),
      ],
      removedAddresses: ['/Research', '/Research/Study', '/Research/Study/student'],
      retainedAddress: null,
    },
    {
      change: 'move',
      nextDefinitions: () => [
        definition('root-def', 'teacher', [
          { memberName: 'teacher', ref: 'teacher-def', refType: 'AGENT' },
          { memberName: 'Research', ref: 'research-def', refType: 'AGENT_TEAM' },
          { memberName: 'Study', ref: 'study-def', refType: 'AGENT_TEAM' },
          { memberName: 'Sibling', ref: 'sibling-def', refType: 'AGENT_TEAM' },
        ]),
        definition('research-def', 'lead', [
          { memberName: 'lead', ref: 'lead-def', refType: 'AGENT' },
        ]),
        ...definitions.filter((item) => ['study-def', 'sibling-def'].includes(item.id)),
      ],
      removedAddresses: ['/Research/Study', '/Research/Study/student'],
      retainedAddress: '/Research',
    },
  ])('prunes $change-address workspace state without retargeting and preserves valid buffers', ({
    nextDefinitions,
    removedAddresses,
    retainedAddress,
  }) => {
    const store = useTeamRunConfigStore()
    store.setConfig(hierarchicalConfig())
    const draftId = store.selectedDraft!.draftId
    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId, teamAddress: '/',
      selection: { mode: 'new', existingWorkspaceId: 'ws-root', newWorkspacePath: '/workspace/root-pending' },
    })
    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId, teamAddress: '/Research',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/research-buffer' },
    })
    if (retainedAddress) {
      store.applyTeamWorkspaceAuthoringCommand({
        kind: 'set_selection', draftId, teamAddress: '/Research',
        selection: { mode: 'existing', existingWorkspaceId: null, newWorkspacePath: '/ignored' },
      })
      store.applyTeamWorkspaceAuthoringCommand({
        kind: 'set_selection', draftId, teamAddress: '/Research/Study',
        selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/study-active' },
      })
    }
    useAgentTeamDefinitionStore().agentTeamDefinitions = nextDefinitions()

    const result = store.reconcileSelectedDraftTopology(store.memberTree!)

    expect(result.repaired).toBe(true)
    expect(result.addresses).toEqual(expect.arrayContaining(removedAddresses))
    for (const address of removedAddresses) {
      expect(store.selectedDraft!.teamWorkspaceAuthoringByTeamAddress[address]).toBeUndefined()
    }
    expect(store.teamWorkspaceAuthoringViewFor('/').selection.newWorkspacePath).toBe('/workspace/root-pending')
    if (retainedAddress) {
      expect(store.teamWorkspaceAuthoringViewFor(retainedAddress).selection).toMatchObject({
        mode: 'existing', newWorkspacePath: '/workspace/research-buffer',
      })
    }
  })

  it('isolates workspace buffers by draft identity and clears a nested buffer on reset', () => {
    const store = useTeamRunConfigStore()
    store.setConfig(hierarchicalConfig())
    const firstId = store.selectedDraft!.draftId
    store.applyTeamWorkspaceAuthoringCommand({
      kind: 'set_selection', draftId: firstId, teamAddress: '/Research',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/first' },
    })

    store.setConfig(hierarchicalConfig())
    const secondId = store.selectedDraft!.draftId
    expect(secondId).not.toBe(firstId)
    expect(store.teamWorkspaceAuthoringViewFor('/Research').selection.mode).toBe('existing')

    store.selectDraft(firstId)
    expect(store.teamWorkspaceAuthoringViewFor('/Research').selection.newWorkspacePath).toBe('/workspace/first')
    store.applyConfigEdit({ kind: 'reset_team_override', teamAddress: '/Research' })
    expect(store.selectedDraft!.teamWorkspaceAuthoringByTeamAddress['/Research']).toBeUndefined()
    expect(store.config?.teamOverrides['/Research']).toBeUndefined()
  })
})
