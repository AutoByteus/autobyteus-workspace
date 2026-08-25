import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import RunConfigPanel from '../RunConfigPanel.vue'
import AgentRunConfigForm from '../AgentRunConfigForm.vue'
import TeamRunConfigForm from '../TeamRunConfigForm.vue'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'

const { agentRunState, teamRunState, agentContextState, teamContextState, teamRunOwnerState } = vi.hoisted(() => ({
  agentRunState: {
    config: null,
    workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
    isConfigured: false,
    updateAgentConfig: vi.fn((patch: Record<string, unknown>) => {
      agentRunState.config = { ...(agentRunState.config || {}), ...patch } as any
    }),
    setWorkspaceLoading: vi.fn((isLoading: boolean) => {
      agentRunState.workspaceLoadingState.isLoading = isLoading
      if (isLoading) agentRunState.workspaceLoadingState.error = null
    }),
    setWorkspaceLoaded: vi.fn((workspaceId: string, path: string, workspaceMetadata: any) => {
      agentRunState.workspaceLoadingState = { isLoading: false, error: null, loadedPath: path }
      agentRunState.config = {
        ...(agentRunState.config || {}),
        workspaceId,
        workspaceMetadata,
      } as any
      agentRunState.isConfigured = Boolean(agentRunState.config?.llmModelIdentifier && workspaceId)
    }),
    setWorkspaceError: vi.fn((message: string) => {
      agentRunState.workspaceLoadingState.isLoading = false
      agentRunState.workspaceLoadingState.error = message
    }),
    clearConfig: vi.fn(),
  },
  teamRunState: {
    config: null,
    selectedDraft: null,
    teamWorkspaceAuthoringByTeamAddress: {} as Record<string, any>,
    runtimeModelCatalogStates: {} as Record<string, any>,
    repairNotice: null as any,
    launchReadiness: { canLaunch: false, blockingIssues: [], unresolvedMembers: [] },
    applyConfigEdit: vi.fn((edit: any) => {
      const config = structuredClone(teamRunState.config || {}) as any
      if (edit.kind === 'set_root_workspace') config.rootConfig.workspace = edit.workspace
      else if (edit.kind === 'set_root_runtime') config.rootConfig.runtimeKind = edit.runtimeKind
      else if (edit.kind === 'set_root_model') config.rootConfig.llmModelIdentifier = edit.llmModelIdentifier
      else if (edit.kind === 'set_root_llm_config') config.rootConfig.llmConfig = edit.llmConfig
      else if (edit.kind === 'set_root_auto_execute_tools') config.rootConfig.autoExecuteTools = edit.autoExecuteTools
      else if (edit.kind === 'set_team_override') {
        config.teamOverrides = { ...(config.teamOverrides || {}) }
        if (edit.override) config.teamOverrides[edit.teamAddress] = edit.override
        else delete config.teamOverrides[edit.teamAddress]
      }
      else if (edit.kind === 'reset_team_override') delete config.teamOverrides[edit.teamAddress]
      else if (edit.kind === 'set_agent_override') {
        config.agentOverrides = { ...(config.agentOverrides || {}) }
        if (edit.override) config.agentOverrides[edit.agentAddress] = edit.override
        else delete config.agentOverrides[edit.agentAddress]
      }
      teamRunState.config = config
      if (teamRunState.selectedDraft) {
        teamRunState.selectedDraft = Object.freeze({
          ...teamRunState.selectedDraft,
          config: Object.freeze({ ...config }),
        }) as any
      }
    }),
    teamWorkspaceAuthoringViewFor: vi.fn((teamAddress: string) => {
      const state = teamRunState.teamWorkspaceAuthoringByTeamAddress[teamAddress]
      const config = teamRunState.config as any
      const workspace = teamAddress === '/'
        ? config?.rootConfig?.workspace
        : config?.teamOverrides?.[teamAddress]?.workspace
      return {
        selection: {
          mode: state?.selectionMode ?? 'existing',
          existingWorkspaceId: workspace?.workspaceId ?? null,
          newWorkspacePath: state?.newWorkspacePath ?? workspace?.workspaceMetadata?.workspaceRootPath ?? '',
        },
        operation: state?.operation ?? { status: 'idle', error: null },
      }
    }),
    applyTeamWorkspaceAuthoringCommand: vi.fn(),
    clearConfig: vi.fn(),
  },
  agentContextState: {
    activeRun: null,
    createRunFromTemplate: vi.fn(),
  },
  teamContextState: {
    activeTeamContext: null,
  },
  teamRunOwnerState: {
    launchDraft: vi.fn(),
    isDraftLaunchPending: vi.fn(),
  },
}))

const editableTeamConfig = (input: {
  workspaceId?: string | null
  workspaceMetadata?: Record<string, unknown> | null
  llmModelIdentifier?: string
} = {}) => ({
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Team team-def-1',
  rootConfig: {
    runtimeKind: 'autobyteus',
    workspace: {
      workspaceId: input.workspaceId ?? null,
      workspaceMetadata: input.workspaceMetadata ?? null,
    },
    llmModelIdentifier: input.llmModelIdentifier ?? 'model-x',
    llmConfig: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
  },
  teamOverrides: {},
  agentOverrides: {},
  isLocked: false,
})
const selectEditableTeamDraft = (teamStore: any, config: any, draftId: string) => {
  teamStore.config = config
  teamStore.selectedDraft = Object.freeze({
    draftId,
    config: Object.freeze(structuredClone(config)),
    focusedMemberAddress: '/coordinator',
    pendingInputsByMemberAddress: Object.freeze({}),
    teamWorkspaceAuthoringByTeamAddress: Object.freeze({}),
  })
}
const { workspaceCenterViewStoreMock, workspaceStoreMock } = vi.hoisted(() => ({
  workspaceCenterViewStoreMock: {
    showChat: vi.fn(),
  },
  workspaceStoreMock: {
    createWorkspace: vi.fn(),
    workspaces: {} as Record<string, any>,
    workspaceMetadataById: {} as Record<string, any>,
    registerWorkspaceInfoMetadata: vi.fn((workspace: any) => ({
      workspaceId: workspace.workspaceId,
      workspaceRootPath: workspace.workspaceRootPath || workspace.absolutePath,
      displayName: workspace.name || workspace.workspaceId,
      kind: workspace.kind || 'filesystem',
    })),
    allWorkspaces: [] as any[],
    tempWorkspaceId: null as string | null,
    tempWorkspace: null as any,
    fetchAllWorkspaces: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('~/stores/agentRunConfigStore', async () => {
  const { reactive } = await import('vue')
  const store = reactive(agentRunState)
  return { useAgentRunConfigStore: () => store }
})

vi.mock('~/stores/teamRunConfigStore', async () => {
  const { reactive } = await import('vue')
  const store = reactive(teamRunState)
  teamRunState.applyTeamWorkspaceAuthoringCommand.mockImplementation((command: any) => {
    const value = {
      selectionMode: command.selection.mode,
      newWorkspacePath: command.selection.newWorkspacePath,
      operation: { status: 'idle', error: null },
    }
    store.teamWorkspaceAuthoringByTeamAddress = {
      ...store.teamWorkspaceAuthoringByTeamAddress,
      [command.teamAddress]: value,
    }
    if (store.selectedDraft) {
      store.selectedDraft = Object.freeze({
        ...store.selectedDraft,
        teamWorkspaceAuthoringByTeamAddress: Object.freeze({ ...store.teamWorkspaceAuthoringByTeamAddress }),
      }) as any
    }
    let retained = [...store.launchReadiness.blockingIssues]
    if (command.selection.mode === 'new') {
      retained = retained.filter((issue: any) =>
        issue.code !== 'WORKSPACE_REQUIRED' || issue.subjectAddress !== command.teamAddress)
      if (!command.selection.newWorkspacePath.trim()) retained.unshift({
        code: 'WORKSPACE_REQUIRED', message: 'Enter a workspace path to run this team.',
        subjectAddress: command.teamAddress, subjectKind: 'TEAM',
      })
    }
    store.launchReadiness = {
      ...store.launchReadiness,
      canLaunch: retained.length === 0,
      blockingIssues: retained,
    }
  })
  return { useTeamRunConfigStore: () => store }
})

vi.mock('~/stores/agentContextsStore', async () => {
  const { reactive } = await import('vue')
  return { useAgentContextsStore: () => reactive(agentContextState) }
})

vi.mock('~/stores/agentTeamContextsStore', async () => {
  const { reactive } = await import('vue')
  return { useAgentTeamContextsStore: () => reactive(teamContextState) }
})

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => teamRunOwnerState,
}))

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}))

vi.mock('~/composables/useTeamRunRuntimeCatalogSync', () => ({
  useTeamRunRuntimeCatalogSync: () => ({ reloadRuntimeKind: vi.fn() }),
}))

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({
    getAgentDefinitionById: (id: string) => ({ id, name: 'Agent ' + id }),
  }),
}))

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => ({
    getAgentTeamDefinitionById: (id: string) => ({ id, name: 'Team ' + id, nodes: [] }),
  }),
}))

vi.mock('~/stores/workspaceCenterViewStore', () => ({
  useWorkspaceCenterViewStore: () => workspaceCenterViewStoreMock,
}))

describe('RunConfigPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    workspaceCenterViewStoreMock.showChat.mockReset()
    agentRunState.config = null
    agentRunState.workspaceLoadingState = { isLoading: false, error: null, loadedPath: null }
    agentRunState.isConfigured = false
    teamRunState.config = null
    teamRunState.selectedDraft = null
    teamRunState.teamWorkspaceAuthoringByTeamAddress = {}
    teamRunState.runtimeModelCatalogStates = {}
    teamRunState.repairNotice = null
    teamRunState.launchReadiness = { canLaunch: false, blockingIssues: [], unresolvedMembers: [] }
    agentRunState.updateAgentConfig.mockClear()
    agentRunState.setWorkspaceLoading.mockClear()
    agentRunState.setWorkspaceLoaded.mockClear()
    agentRunState.setWorkspaceError.mockReset()
    agentRunState.setWorkspaceError.mockImplementation((message: string) => {
      agentRunState.workspaceLoadingState.isLoading = false
      agentRunState.workspaceLoadingState.error = message
    })
    agentRunState.clearConfig.mockReset()
    teamRunState.applyConfigEdit.mockClear()
    teamRunState.applyTeamWorkspaceAuthoringCommand.mockClear()
    teamRunState.teamWorkspaceAuthoringViewFor.mockClear()
    teamRunState.clearConfig.mockReset()
    agentContextState.activeRun = null
    agentContextState.createRunFromTemplate.mockReset()
    teamContextState.activeTeamContext = null
    teamRunOwnerState.launchDraft.mockReset()
    teamRunOwnerState.launchDraft.mockResolvedValue('team-run-1')
    teamRunOwnerState.isDraftLaunchPending.mockReset()
    teamRunOwnerState.isDraftLaunchPending.mockReturnValue(false)
    workspaceStoreMock.createWorkspace.mockReset()
    workspaceStoreMock.createWorkspace.mockImplementation(async ({ root_path }: { root_path: string }) => {
      workspaceStoreMock.workspaces['ws-created'] = {
        workspaceId: 'ws-created',
        workspaceRootPath: root_path,
        absolutePath: root_path,
        name: 'Created Workspace',
        workspaceConfig: { root_path },
      }
      workspaceStoreMock.workspaceMetadataById['ws-created'] = {
        workspaceId: 'ws-created',
        workspaceRootPath: root_path,
        displayName: 'Created Workspace',
        kind: 'filesystem',
      }
      return 'ws-created'
    })
    workspaceStoreMock.workspaces = {}
    workspaceStoreMock.workspaceMetadataById = {}
    workspaceStoreMock.registerWorkspaceInfoMetadata.mockClear()
  })

  it('renders placeholder when nothing selected', () => {
    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })
    expect(wrapper.text()).toContain('Select an agent or team')
  })

  it('renders Agent Form when Agent Template set', async () => {
    const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore')
    const store = useAgentRunConfigStore() as any
    store.config = { agentDefinitionId: 'def-1', workspaceId: null } as any
    store.isConfigured = true

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    expect(wrapper.findComponent(AgentRunConfigForm).exists()).toBe(true)
  })

  it('renders Team Form when Team Template set', async () => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const store = useTeamRunConfigStore() as any
    store.config = editableTeamConfig() as any
    store.launchReadiness = { canLaunch: false, blockingIssues: [], unresolvedMembers: [] } as any

    const selectionStore = useAgentSelectionStore()
    selectionStore.clearSelection()

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    expect(wrapper.findComponent(TeamRunConfigForm).exists()).toBe(true)
  })

  it('triggers team run on button click when launch readiness passes', async () => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    selectEditableTeamDraft(teamStore, editableTeamConfig({
      workspaceId: 'ws-1',
      workspaceMetadata: { workspaceRootPath: '/workspace/one' },
    }), 'team-draft-1')
    teamStore.launchReadiness = { canLaunch: true, blockingIssues: [], unresolvedMembers: [] } as any

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    await wrapper.find('.run-btn').trigger('click')

    expect(teamRunOwnerState.launchDraft).toHaveBeenCalledTimes(1)
    expect(teamRunOwnerState.launchDraft).toHaveBeenCalledWith(teamStore.selectedDraft)
    expect(teamStore.clearConfig).not.toHaveBeenCalled()
  })

  it('renders the selected draft read-only and rejects duplicate launch/edit/workspace actions while its owner reports pending', async () => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    selectEditableTeamDraft(teamStore, editableTeamConfig({
      workspaceId: 'ws-1',
      workspaceMetadata: { workspaceRootPath: '/workspace/one' },
    }), 'team-draft-pending')
    teamStore.launchReadiness = { canLaunch: true, blockingIssues: [], unresolvedMembers: [] } as any
    teamRunOwnerState.isDraftLaunchPending.mockImplementation(
      (draftId: string | null) => draftId === 'team-draft-pending',
    )

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })
    const form = wrapper.findComponent(TeamRunConfigForm)

    expect(teamRunOwnerState.isDraftLaunchPending).toHaveBeenCalledWith('team-draft-pending')
    expect(form.props('model')).toEqual(expect.objectContaining({ mode: 'editable', isLocked: true }))
    expect(wrapper.find('.run-btn').attributes('disabled')).toBeDefined()
    await wrapper.find('.run-btn').trigger('click')
    form.vm.$emit('update:workspaceSelection', '/', {
      mode: 'existing',
      existingWorkspaceId: 'ws-other',
      newWorkspacePath: '',
    })
    form.vm.$emit('edit-config', { kind: 'set_model', llmModelIdentifier: 'other-model' })
    await wrapper.vm.$nextTick()

    expect(teamRunOwnerState.launchDraft).not.toHaveBeenCalled()
    expect(teamStore.applyConfigEdit).not.toHaveBeenCalled()
    expect(teamStore.config.rootConfig.workspace.workspaceId).toBe('ws-1')
    expect(teamStore.config.rootConfig.llmModelIdentifier).toBe('model-x')
  })

  it('loads a pending New workspace path before creating an agent run', async () => {
    const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore')
    const agentStore = useAgentRunConfigStore() as any
    agentStore.config = {
      agentDefinitionId: 'def-1',
      agentDefinitionName: 'Agent def-1',
      llmModelIdentifier: 'model-x',
      workspaceId: 'temp_ws_default',
      workspaceMetadata: { workspaceRootPath: '/tmp/default' },
      isLocked: false,
    } as any
    agentStore.isConfigured = true
    workspaceStoreMock.workspaces.temp_ws_default = {
      workspaceId: 'temp_ws_default',
      absolutePath: '/tmp/default',
      workspaceRootPath: '/tmp/default',
      workspaceConfig: { root_path: '/tmp/default' },
    }

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    wrapper.findComponent(AgentRunConfigForm).vm.$emit('update:workspaceSelection', {
      mode: 'new',
      existingWorkspaceId: 'temp_ws_default',
      newWorkspacePath: '/home/autobyteus/workspace',
    })
    await wrapper.find('.run-btn').trigger('click')
    await Promise.resolve()

    expect(workspaceStoreMock.createWorkspace).toHaveBeenCalledWith({
      root_path: '/home/autobyteus/workspace',
    })
    expect(agentStore.setWorkspaceLoaded).toHaveBeenCalledWith(
      'ws-created',
      '/home/autobyteus/workspace',
      expect.objectContaining({
        workspaceId: 'ws-created',
        workspaceRootPath: '/home/autobyteus/workspace',
      }),
    )
    expect(agentContextState.createRunFromTemplate).toHaveBeenCalledTimes(1)
    expect(agentStore.clearConfig).toHaveBeenCalledTimes(1)
  })

  it('blocks agent run creation when pending New workspace loading fails', async () => {
    const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore')
    const agentStore = useAgentRunConfigStore() as any
    agentStore.config = {
      agentDefinitionId: 'def-1',
      agentDefinitionName: 'Agent def-1',
      llmModelIdentifier: 'model-x',
      workspaceId: 'temp_ws_default',
      workspaceMetadata: { workspaceRootPath: '/tmp/default' },
      isLocked: false,
    } as any
    agentStore.isConfigured = true
    workspaceStoreMock.workspaces.temp_ws_default = {
      workspaceId: 'temp_ws_default',
      absolutePath: '/tmp/default',
      workspaceRootPath: '/tmp/default',
      workspaceConfig: { root_path: '/tmp/default' },
    }
    workspaceStoreMock.createWorkspace.mockRejectedValueOnce(new Error('Cannot create workspace'))

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    const form = wrapper.findComponent(AgentRunConfigForm)
    const requestedSelection = {
      mode: 'new',
      existingWorkspaceId: 'temp_ws_default',
      newWorkspacePath: '/bad/path',
    }
    form.vm.$emit('update:workspaceSelection', requestedSelection)
    await wrapper.find('.run-btn').trigger('click')
    await Promise.resolve()

    expect(agentStore.setWorkspaceError).toHaveBeenCalledWith('Cannot create workspace')
    expect(agentContextState.createRunFromTemplate).not.toHaveBeenCalled()
    expect(agentStore.clearConfig).not.toHaveBeenCalled()
    expect(form.props('workspaceSelection')).toEqual(requestedSelection)
    expect(agentStore.config.workspaceId).toBe('temp_ws_default')
    expect(agentStore.workspaceLoadingState.error).toBe('Cannot create workspace')
  })

  it('allows Run Agent with a non-empty pending New path even before it is preloaded', async () => {
    const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore')
    const agentStore = useAgentRunConfigStore() as any
    agentStore.config = {
      agentDefinitionId: 'def-1',
      agentDefinitionName: 'Agent def-1',
      llmModelIdentifier: 'model-x',
      workspaceId: null,
      workspaceMetadata: null,
      isLocked: false,
    } as any
    agentStore.isConfigured = false

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    expect(wrapper.find('.run-btn').attributes('disabled')).toBeDefined()
    wrapper.findComponent(AgentRunConfigForm).vm.$emit('update:workspaceSelection', {
      mode: 'new',
      existingWorkspaceId: null,
      newWorkspacePath: '/home/autobyteus/workspace',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.run-btn').attributes('disabled')).toBeUndefined()
  })

  it('preserves the controlled New workspace across mutable Agent buffer edits', async () => {
    const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore')
    const agentStore = useAgentRunConfigStore() as any
    agentStore.config = {
      agentDefinitionId: 'def-1',
      agentDefinitionName: 'Agent def-1',
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'model-x',
      workspaceId: 'temp_ws_default',
      workspaceMetadata: { workspaceRootPath: '/tmp/default' },
      autoExecuteTools: false,
      isLocked: false,
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: { stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true } },
    })
    const form = wrapper.findComponent(AgentRunConfigForm)
    const requestedSelection = {
      mode: 'new',
      existingWorkspaceId: 'temp_ws_default',
      newWorkspacePath: '/workspace/agent-pending',
    }
    form.vm.$emit('update:workspaceSelection', requestedSelection)
    await wrapper.vm.$nextTick()

    agentStore.config.runtimeKind = 'codex_app_server'
    agentStore.config.llmModelIdentifier = 'gpt-5.6-sol'
    agentStore.config.autoExecuteTools = true
    await wrapper.vm.$nextTick()

    expect(form.props('workspaceSelection')).toEqual(requestedSelection)
  })

  it('disables Run Agent for an active empty New workspace while retaining the canonical Temp config', async () => {
    const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore')
    const agentStore = useAgentRunConfigStore() as any
    agentStore.config = {
      agentDefinitionId: 'def-1',
      agentDefinitionName: 'Agent def-1',
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'model-x',
      workspaceId: 'temp_ws_default',
      workspaceMetadata: { workspaceRootPath: '/tmp/default' },
      isLocked: false,
    } as any
    agentStore.isConfigured = true

    const wrapper = mount(RunConfigPanel, {
      global: { stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true } },
    })
    const form = wrapper.findComponent(AgentRunConfigForm)
    expect(wrapper.find('.run-btn').attributes('disabled')).toBeUndefined()

    form.vm.$emit('update:workspaceSelection', {
      mode: 'new',
      existingWorkspaceId: 'temp_ws_default',
      newWorkspacePath: '   ',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.run-btn').attributes('disabled')).toBeDefined()
    expect(agentStore.config.workspaceId).toBe('temp_ws_default')
    expect(agentContextState.createRunFromTemplate).not.toHaveBeenCalled()
  })

  it('does not admit an Agent workspace from an inactive New-path buffer in Existing mode', async () => {
    const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore')
    const agentStore = useAgentRunConfigStore() as any
    agentStore.config = {
      agentDefinitionId: 'def-1',
      agentDefinitionName: 'Agent def-1',
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'model-x',
      workspaceId: null,
      workspaceMetadata: null,
      isLocked: false,
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: { stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true } },
    })
    wrapper.findComponent(AgentRunConfigForm).vm.$emit('update:workspaceSelection', {
      mode: 'existing',
      existingWorkspaceId: null,
      newWorkspacePath: '/inactive/agent-buffer',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.run-btn').attributes('disabled')).toBeDefined()
    expect(agentStore.config.workspaceId).toBeNull()
    expect(agentContextState.createRunFromTemplate).not.toHaveBeenCalled()
  })

  it('rehydrates the controlled Agent workspace only when the Agent draft identity changes', async () => {
    const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore')
    const agentStore = useAgentRunConfigStore() as any
    agentStore.config = {
      agentDefinitionId: 'def-1',
      agentDefinitionName: 'Agent def-1',
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'model-x',
      workspaceId: 'ws-first',
      workspaceMetadata: { workspaceRootPath: '/workspace/first' },
      isLocked: false,
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: { stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true } },
    })
    const form = wrapper.findComponent(AgentRunConfigForm)
    form.vm.$emit('update:workspaceSelection', {
      mode: 'new',
      existingWorkspaceId: 'ws-first',
      newWorkspacePath: '/workspace/pending-first',
    })
    await wrapper.vm.$nextTick()

    agentStore.config = {
      ...agentStore.config,
      workspaceId: 'ws-second',
      workspaceMetadata: { workspaceRootPath: '/workspace/second' },
    } as any
    await vi.waitFor(() => {
      const currentForm = wrapper.findComponent(AgentRunConfigForm)
      expect(currentForm.props('config').workspaceId).toBe('ws-second')
      expect(currentForm.props('workspaceSelection')).toEqual({
        mode: 'existing',
        existingWorkspaceId: 'ws-second',
        newWorkspacePath: '/workspace/second',
      })
    })
  })

  it('hands two active New Team workspace commands to the draft owner and launches the exact current draft once', async () => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    const initialConfig = editableTeamConfig({ workspaceId: null, workspaceMetadata: null })
    initialConfig.teamOverrides['/Research'] = {
      workspace: { workspaceId: null, workspaceMetadata: null },
    }
    teamStore.config = initialConfig as any
    teamStore.selectedDraft = Object.freeze({
      draftId: 'team-draft-two-new-workspaces',
      config: Object.freeze(structuredClone(initialConfig)),
      focusedMemberAddress: '/coordinator',
      pendingInputsByMemberAddress: Object.freeze({}),
      teamWorkspaceAuthoringByTeamAddress: Object.freeze({}),
    }) as any
    teamStore.launchReadiness = {
      canLaunch: false,
      blockingIssues: [
        { code: 'WORKSPACE_REQUIRED', message: 'Root workspace is required.', subjectAddress: '/' },
        { code: 'WORKSPACE_REQUIRED', message: 'Research workspace is required.', subjectAddress: '/Research' },
      ],
      unresolvedMembers: [],
    } as any
    const wrapper = mount(RunConfigPanel, {
      global: { stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true } },
    })
    const form = wrapper.findComponent(TeamRunConfigForm)
    form.vm.$emit('update:workspaceSelection', '/', {
      mode: 'new',
      existingWorkspaceId: null,
      newWorkspacePath: '/workspace/root',
    })
    form.vm.$emit('update:workspaceSelection', '/Research', {
      mode: 'new',
      existingWorkspaceId: null,
      newWorkspacePath: '/workspace/research',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.run-btn').attributes('disabled')).toBeUndefined()
    await wrapper.find('.run-btn').trigger('click')
    await vi.waitFor(() => expect(teamRunOwnerState.launchDraft).toHaveBeenCalledTimes(1))

    expect(teamStore.applyTeamWorkspaceAuthoringCommand).toHaveBeenNthCalledWith(1, {
      kind: 'set_selection',
      draftId: 'team-draft-two-new-workspaces',
      teamAddress: '/',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/root' },
    })
    expect(teamStore.applyTeamWorkspaceAuthoringCommand).toHaveBeenNthCalledWith(2, {
      kind: 'set_selection',
      draftId: 'team-draft-two-new-workspaces',
      teamAddress: '/Research',
      selection: { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/research' },
    })
    expect(workspaceStoreMock.createWorkspace).not.toHaveBeenCalled()
    expect(teamRunOwnerState.launchDraft).toHaveBeenCalledWith(teamStore.selectedDraft)
    expect(teamStore.selectedDraft.teamWorkspaceAuthoringByTeamAddress).toMatchObject({
      '/': { selectionMode: 'new', newWorkspacePath: '/workspace/root' },
      '/Research': { selectionMode: 'new', newWorkspacePath: '/workspace/research' },
    })
  })

  it.each([
    {
      name: 'root runtime',
      address: '/',
      edit: { kind: 'set_root_runtime', runtimeKind: 'codex_app_server' },
      expectedConfig: { rootConfig: { runtimeKind: 'codex_app_server' } },
    },
    {
      name: 'root model',
      address: '/',
      edit: { kind: 'set_root_model', llmModelIdentifier: 'gpt-5.6-luna' },
      expectedConfig: { rootConfig: { llmModelIdentifier: 'gpt-5.6-luna' } },
    },
    {
      name: 'root reasoning and fast controls',
      address: '/',
      edit: { kind: 'set_root_llm_config', llmConfig: { reasoning_effort: 'high', service_tier: 'fast' } },
      expectedConfig: { rootConfig: { llmConfig: { reasoning_effort: 'high', service_tier: 'fast' } } },
    },
    {
      name: 'root auto-execute',
      address: '/',
      edit: { kind: 'set_root_auto_execute_tools', autoExecuteTools: true },
      expectedConfig: { rootConfig: { autoExecuteTools: true } },
    },
    {
      name: 'explicit nested Team override',
      address: '/Research',
      edit: {
        kind: 'set_team_override',
        teamAddress: '/Research',
        override: { runtimeKind: 'autobyteus', llmModelIdentifier: 'deepseek-v4-flash', autoExecuteTools: true },
      },
      expectedConfig: {
        teamOverrides: {
          '/Research': { runtimeKind: 'autobyteus', llmModelIdentifier: 'deepseek-v4-flash', autoExecuteTools: true },
        },
      },
    },
    {
      name: 'exact nested Agent override',
      address: '/Research',
      edit: {
        kind: 'set_agent_override',
        agentAddress: '/Research/researcher',
        override: { autoExecuteTools: true },
      },
      expectedConfig: { agentOverrides: { '/Research/researcher': { autoExecuteTools: true } } },
    },
  ])('preserves the $address New workspace across immutable same-draft $name edits', async ({
    address,
    edit,
    expectedConfig,
  }) => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    teamStore.config = editableTeamConfig({
      workspaceId: 'temp_ws_default',
      workspaceMetadata: { workspaceRootPath: '/tmp/default' },
    }) as any
    teamStore.selectedDraft = Object.freeze({
      draftId: 'team-draft-stable-workspace',
      config: Object.freeze({ ...teamStore.config }),
      focusedMemberAddress: '/coordinator',
      pendingInputsByMemberAddress: Object.freeze({}),
    }) as any
    teamStore.launchReadiness = { canLaunch: true, blockingIssues: [], unresolvedMembers: [] } as any

    const wrapper = mount(RunConfigPanel, {
      global: { stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true } },
    })
    const form = wrapper.findComponent(TeamRunConfigForm)
    const requestedSelection = {
      mode: 'new',
      existingWorkspaceId: 'temp_ws_default',
      newWorkspacePath: `/home/autobyteus/workspace${address === '/' ? '/root' : '/research'}`,
    }

    form.vm.$emit('update:workspaceSelection', address, requestedSelection)
    await wrapper.vm.$nextTick()
    form.vm.$emit('edit-config', edit)
    await wrapper.vm.$nextTick()

    expect(teamStore.selectedDraft.teamWorkspaceAuthoringByTeamAddress[address]).toMatchObject({
      selectionMode: 'new',
      newWorkspacePath: requestedSelection.newWorkspacePath,
    })
    expect(teamStore.config).toMatchObject(expectedConfig)

    await wrapper.find('.run-btn').trigger('click')
    await vi.waitFor(() => expect(teamRunOwnerState.launchDraft).toHaveBeenCalledTimes(1))
    expect(workspaceStoreMock.createWorkspace).not.toHaveBeenCalled()
    expect(teamStore.selectedDraft.config).toMatchObject(expectedConfig)
    expect(teamStore.selectedDraft.teamWorkspaceAuthoringByTeamAddress[address].newWorkspacePath)
      .toBe(requestedSelection.newWorkspacePath)
  })

  it('disables team run and shows the blocking message when mixed-runtime readiness fails', async () => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    teamStore.config = editableTeamConfig({
      workspaceId: 'ws-1',
      workspaceMetadata: { workspaceRootPath: '/workspace/one' },
    }) as any
    teamStore.launchReadiness = {
      canLaunch: false,
      blockingIssues: [
        {
          code: 'MEMBER_UNRESOLVED_INHERITED_MODEL',
          message: 'Global model gpt-5.4 is unavailable for Claude Agent SDK; choose a compatible Reviewer model or clear the runtime override.',
          memberName: 'Reviewer',
          runtimeKind: 'claude_agent_sdk',
        },
      ],
      unresolvedMembers: [
        {
          memberName: 'Reviewer',
          runtimeKind: 'claude_agent_sdk',
          message: 'Global model gpt-5.4 is unavailable for Claude Agent SDK; choose a compatible Reviewer model or clear the runtime override.',
        },
      ],
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    const runButton = wrapper.find('.run-btn')
    expect(runButton.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="team-run-blocking-issue"]').text()).toContain(
      'Global model gpt-5.4 is unavailable for Claude Agent SDK',
    )
  })

  it('disables team run when workspace is missing', async () => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    teamStore.config = editableTeamConfig() as any
    teamStore.launchReadiness = {
      canLaunch: false,
      blockingIssues: [{ code: 'WORKSPACE_REQUIRED', message: 'Workspace is required to run a team.' }],
      unresolvedMembers: [],
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    expect(wrapper.find('.run-btn').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="team-run-blocking-issue"]').text()).toContain('Workspace is required to run a team.')
  })

  it.each([
    { name: 'root Team', address: '/', rootHasWorkspace: false, message: 'Root workspace is required.' },
    { name: 'nested Team', address: '/Research', rootHasWorkspace: true, message: 'Research workspace is required.' },
  ])('does not admit a missing $name workspace from an inactive New-path buffer in Existing mode', async ({
    address,
    rootHasWorkspace,
    message,
  }) => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    const config = editableTeamConfig({
      workspaceId: rootHasWorkspace ? 'ws-root' : null,
      workspaceMetadata: rootHasWorkspace ? { workspaceRootPath: '/workspace/root' } : null,
    }) as any
    if (address !== '/') {
      config.teamOverrides[address] = { workspace: { workspaceId: null, workspaceMetadata: null } }
    }
    selectEditableTeamDraft(teamStore, config, `inactive-new-${address}`)
    teamStore.launchReadiness = {
      canLaunch: false,
      blockingIssues: [{ code: 'WORKSPACE_REQUIRED', message, subjectAddress: address }],
      unresolvedMembers: [],
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: { stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true } },
    })
    wrapper.findComponent(TeamRunConfigForm).vm.$emit('update:workspaceSelection', address, {
      mode: 'existing',
      existingWorkspaceId: null,
      newWorkspacePath: `/inactive${address === '/' ? '/root' : '/research'}-buffer`,
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.run-btn').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="team-run-blocking-issue"]').text()).toBe(message)
    expect(teamStore.config.rootConfig.workspace.workspaceId).toBe(rootHasWorkspace ? 'ws-root' : null)
    expect(teamStore.config.teamOverrides[address]?.workspace?.workspaceId ?? null).toBeNull()
  })

  it.each([
    { name: 'root Team', address: '/' },
    { name: 'nested Team', address: '/Research' },
  ])('disables Run Team for an active empty New workspace on the $name', async ({ address }) => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    const config = editableTeamConfig({
      workspaceId: 'temp_ws_default',
      workspaceMetadata: {
        workspaceId: 'temp_ws_default',
        workspaceRootPath: '/tmp/default',
        displayName: 'Temp workspace',
        kind: 'filesystem',
      },
    }) as any
    selectEditableTeamDraft(teamStore, config, `active-empty-${address}`)
    teamStore.launchReadiness = { canLaunch: true, blockingIssues: [], unresolvedMembers: [] } as any

    const wrapper = mount(RunConfigPanel, {
      global: { stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true } },
    })
    expect(wrapper.find('.run-btn').attributes('disabled')).toBeUndefined()

    wrapper.findComponent(TeamRunConfigForm).vm.$emit('update:workspaceSelection', address, {
      mode: 'new',
      existingWorkspaceId: 'temp_ws_default',
      newWorkspacePath: '   ',
    })
    await wrapper.vm.$nextTick()

    expect(teamStore.config.rootConfig.workspace.workspaceId).toBe('temp_ws_default')
    expect(wrapper.find('.run-btn').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="team-run-blocking-issue"]').text()).toBe(
      'Enter a workspace path to run this team.',
    )
  })

  it('disables agent run when workspace is missing', async () => {
    const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore')
    const agentStore = useAgentRunConfigStore() as any
    agentStore.config = {
      agentDefinitionId: 'def-1',
      agentDefinitionName: 'Agent def-1',
      llmModelIdentifier: 'model-x',
      workspaceId: null,
      isLocked: false,
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    expect(wrapper.find('.run-btn').attributes('disabled')).toBeDefined()
    expect(agentContextState.createRunFromTemplate).not.toHaveBeenCalled()
  })

  it('keeps draft agent configuration editable for workspace selection events', async () => {
    const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore')
    const agentStore = useAgentRunConfigStore() as any
    agentStore.config = {
      agentDefinitionId: 'def-1',
      agentDefinitionName: 'Agent def-1',
      workspaceId: 'ws-original',
      isLocked: false,
    } as any
    agentStore.isConfigured = true

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    const form = wrapper.findComponent(AgentRunConfigForm)
    expect(form.props('readOnly')).toBe(false)

    form.vm.$emit('update:workspaceSelection', {
      mode: 'existing',
      existingWorkspaceId: 'ws-draft-new',
      newWorkspacePath: '',
    })

    expect(agentStore.updateAgentConfig).toHaveBeenCalledWith({
      workspaceId: 'ws-draft-new',
      workspaceMetadata: null,
    })
    expect(agentStore.config?.workspaceId).toBe('ws-draft-new')
  })

  it('keeps draft team configuration editable for workspace selection events', async () => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    const config = editableTeamConfig({ workspaceId: 'ws-original' }) as any
    selectEditableTeamDraft(teamStore, config, 'team-draft-workspace-edit')

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    const form = wrapper.findComponent(TeamRunConfigForm)
    expect(form.props('model')).toEqual(expect.objectContaining({ mode: 'editable', isLocked: false }))

    form.vm.$emit('update:workspaceSelection', '/', {
      mode: 'existing',
      existingWorkspaceId: 'ws-draft-new',
      newWorkspacePath: '',
    })

    expect(teamStore.applyTeamWorkspaceAuthoringCommand).toHaveBeenCalledWith({
      kind: 'set_selection',
      draftId: 'team-draft-workspace-edit',
      teamAddress: '/',
      selection: {
        mode: 'existing',
        existingWorkspaceId: 'ws-draft-new',
        newWorkspacePath: '',
      },
    })
  })

  it('returns to event view from selection-mode config header action', async () => {
    const selectionStore = useAgentSelectionStore()
    selectionStore.selectRun('run-1', 'agent')

    const { useAgentContextsStore } = await import('~/stores/agentContextsStore')
    const contextStore = useAgentContextsStore() as any
    contextStore.activeRun = {
      config: {
        agentDefinitionId: 'def-1',
        agentDefinitionName: 'Agent def-1',
        workspaceId: 'ws-1',
        isLocked: false,
      },
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    const backButton = wrapper.find('[data-test="run-config-back-to-events"]')
    expect(backButton.exists()).toBe(true)
    expect(backButton.attributes('aria-label')).toBe('Back to event view')

    const beforeClickCalls = workspaceCenterViewStoreMock.showChat.mock.calls.length
    await backButton.trigger('click')
    expect(workspaceCenterViewStoreMock.showChat).toHaveBeenCalledTimes(beforeClickCalls + 1)
  })

  it('passes read-only mode to selected existing run configuration and ignores workspace edit events', async () => {
    const selectionStore = useAgentSelectionStore()
    selectionStore.selectRun('run-1', 'agent')

    const { useAgentContextsStore } = await import('~/stores/agentContextsStore')
    const contextStore = useAgentContextsStore() as any
    contextStore.activeRun = {
      config: {
        agentDefinitionId: 'def-1',
        agentDefinitionName: 'Agent def-1',
        workspaceId: 'ws-original',
        isLocked: false,
      },
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    const form = wrapper.findComponent(AgentRunConfigForm)
    expect(form.props('readOnly')).toBe(true)

    form.vm.$emit('update:workspaceSelection', {
      mode: 'existing',
      existingWorkspaceId: 'ws-new',
      newWorkspacePath: '',
    })
    expect(contextStore.activeRun?.config.workspaceId).toBe('ws-original')
  })

  it('passes read-only mode to selected existing team configuration and ignores workspace edit events', async () => {
    const selectionStore = useAgentSelectionStore()
    selectionStore.selectRun('team-run-1', 'team')

    const { useAgentTeamContextsStore } = await import('~/stores/agentTeamContextsStore')
    const contextStore = useAgentTeamContextsStore() as any
    const activeContext = buildTestTeamContext({
      teamRunId: 'team-run-1',
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Team team-def-1',
      rootChildren: [testAgentNode('/coordinator')],
      workspaceRootPath: '/workspace/original',
      configuration: {
        workspaceId: 'ws-original',
        workspaceMetadata: {
          workspaceId: 'ws-original',
          workspaceRootPath: '/workspace/original',
          displayName: 'Original workspace',
          kind: 'filesystem',
        },
        isLocked: true,
      },
    })
    const topologyConfiguration = activeContext.view.getConfigurationView()
    contextStore.activeTeamContext = activeContext

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    const form = wrapper.findComponent(TeamRunConfigForm)
    expect(form.props('model')).toEqual(expect.objectContaining({
      mode: 'stored',
      definitionLabel: 'Team team-def-1',
      isLocked: true,
      root: expect.objectContaining({
        effectiveConfig: expect.objectContaining({
          workspaceId: 'ws-original',
          llmModelIdentifier: 'test-model',
        }),
      }),
    }))
    expect(contextStore.activeTeamContext).toBe(activeContext)
    expect(contextStore.activeTeamContext.view.getConfigurationView()).toBe(topologyConfiguration)
    expect(topologyConfiguration.root.effectiveConfig.workspaceId).toBe('ws-original')
    expect(topologyConfiguration.root.effectiveConfig.llmModelIdentifier).toBe('test-model')
    expect(wrapper.find('.run-btn').exists()).toBe(false)

    form.vm.$emit('update:workspaceSelection', '/', {
      mode: 'existing', existingWorkspaceId: 'ws-other', newWorkspacePath: '/other',
    })
    form.vm.$emit('edit-config', { kind: 'set_root_model', llmModelIdentifier: 'other-model' })
    await wrapper.vm.$nextTick()
    expect(teamRunState.applyConfigEdit).not.toHaveBeenCalled()
    expect(teamRunState.applyTeamWorkspaceAuthoringCommand).not.toHaveBeenCalled()
  })
})
