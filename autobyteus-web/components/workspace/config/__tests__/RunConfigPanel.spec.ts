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
    workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
    launchReadiness: { canLaunch: false, blockingIssues: [], unresolvedMembers: [] },
    applyConfigEdit: vi.fn((edit: any) => {
      const config = { ...(teamRunState.config || {}) } as any
      if (edit.kind === 'set_workspace') {
        config.workspaceId = edit.workspaceId
        config.workspaceMetadata = edit.workspaceMetadata
      } else if (edit.kind === 'set_runtime') config.runtimeKind = edit.runtimeKind
      else if (edit.kind === 'set_model') config.llmModelIdentifier = edit.llmModelIdentifier
      else if (edit.kind === 'set_llm_config') config.llmConfig = edit.llmConfig
      else if (edit.kind === 'set_auto_execute_tools') config.autoExecuteTools = edit.autoExecuteTools
      else if (edit.kind === 'set_member_override') {
        config.memberOverrides = { ...(config.memberOverrides || {}) }
        if (edit.override) config.memberOverrides[edit.memberAddress] = edit.override
        else delete config.memberOverrides[edit.memberAddress]
      }
      teamRunState.config = config
      if (teamRunState.selectedDraft) {
        teamRunState.selectedDraft = Object.freeze({
          ...teamRunState.selectedDraft,
          config: Object.freeze({ ...config }),
        }) as any
      }
    }),
    setWorkspaceLoading: vi.fn((isLoading: boolean) => {
      teamRunState.workspaceLoadingState.isLoading = isLoading
      if (isLoading) teamRunState.workspaceLoadingState.error = null
    }),
    setWorkspaceLoaded: vi.fn((workspaceId: string, path: string, workspaceMetadata: any) => {
      teamRunState.workspaceLoadingState = { isLoading: false, error: null, loadedPath: path }
      teamRunState.config = {
        ...(teamRunState.config || {}),
        workspaceId,
        workspaceMetadata,
      } as any
      if (teamRunState.selectedDraft) {
        teamRunState.selectedDraft = Object.freeze({
          ...teamRunState.selectedDraft,
          config: Object.freeze({ ...teamRunState.config }),
        }) as any
      }
    }),
    setWorkspaceError: vi.fn((message: string) => {
      teamRunState.workspaceLoadingState.isLoading = false
      teamRunState.workspaceLoadingState.error = message
    }),
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
  return { useAgentRunConfigStore: () => reactive(agentRunState) }
})

vi.mock('~/stores/teamRunConfigStore', async () => {
  const { reactive } = await import('vue')
  return { useTeamRunConfigStore: () => reactive(teamRunState) }
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
    teamRunState.workspaceLoadingState = { isLoading: false, error: null, loadedPath: null }
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
    teamRunState.setWorkspaceLoading.mockClear()
    teamRunState.setWorkspaceLoaded.mockClear()
    teamRunState.setWorkspaceError.mockReset()
    teamRunState.setWorkspaceError.mockImplementation((message: string) => {
      teamRunState.workspaceLoadingState.isLoading = false
      teamRunState.workspaceLoadingState.error = message
    })
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
    store.config = { teamDefinitionId: 'team-def-1', workspaceId: null } as any
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
    teamStore.config = { teamDefinitionId: 'team-def-1', workspaceId: 'ws-1' } as any
    teamStore.selectedDraft = Object.freeze({
      draftId: 'team-draft-1',
      config: Object.freeze({ ...teamStore.config }),
      focusedMemberAddress: '/coordinator',
      pendingInputsByMemberAddress: Object.freeze({}),
    }) as any
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
    teamStore.config = { teamDefinitionId: 'team-def-1', workspaceId: 'ws-1' } as any
    teamStore.selectedDraft = Object.freeze({
      draftId: 'team-draft-pending',
      config: Object.freeze({ ...teamStore.config }),
      focusedMemberAddress: '/coordinator',
      pendingInputsByMemberAddress: Object.freeze({}),
    }) as any
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
    expect(form.props('readOnly')).toBe(true)
    expect(wrapper.find('.run-btn').attributes('disabled')).toBeDefined()
    await wrapper.find('.run-btn').trigger('click')
    form.vm.$emit('select-existing', 'ws-other')
    form.vm.$emit('workspace-input-change', { mode: 'new', pendingPath: '/tmp/other' })
    form.vm.$emit('edit-config', { kind: 'set_model', llmModelIdentifier: 'other-model' })
    await wrapper.vm.$nextTick()

    expect(teamRunOwnerState.launchDraft).not.toHaveBeenCalled()
    expect(teamStore.applyConfigEdit).not.toHaveBeenCalled()
    expect(teamStore.config.workspaceId).toBe('ws-1')
    expect(teamStore.config.llmModelIdentifier).toBeUndefined()
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

    wrapper.findComponent(AgentRunConfigForm).vm.$emit('workspace-input-change', {
      mode: 'new',
      pendingPath: '/home/autobyteus/workspace',
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

    wrapper.findComponent(AgentRunConfigForm).vm.$emit('workspace-input-change', {
      mode: 'new',
      pendingPath: '/bad/path',
    })
    await wrapper.find('.run-btn').trigger('click')
    await Promise.resolve()

    expect(agentStore.setWorkspaceError).toHaveBeenCalledWith('Cannot create workspace')
    expect(agentContextState.createRunFromTemplate).not.toHaveBeenCalled()
    expect(agentStore.clearConfig).not.toHaveBeenCalled()
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
    wrapper.findComponent(AgentRunConfigForm).vm.$emit('workspace-input-change', {
      mode: 'new',
      pendingPath: '/home/autobyteus/workspace',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.run-btn').attributes('disabled')).toBeUndefined()
  })

  it('loads a pending New workspace path before creating a team run', async () => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    teamStore.config = {
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Team team-def-1',
      llmModelIdentifier: 'model-x',
      workspaceId: 'temp_ws_default',
      workspaceMetadata: { workspaceRootPath: '/tmp/default' },
      isLocked: false,
    } as any
    teamStore.selectedDraft = Object.freeze({
      draftId: 'team-draft-workspace',
      config: Object.freeze({ ...teamStore.config }),
      focusedMemberAddress: '/coordinator',
      pendingInputsByMemberAddress: Object.freeze({}),
    }) as any
    teamStore.launchReadiness = { canLaunch: true, blockingIssues: [], unresolvedMembers: [] } as any
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

    wrapper.findComponent(TeamRunConfigForm).vm.$emit('workspace-input-change', {
      mode: 'new',
      pendingPath: '/home/autobyteus/team-workspace',
    })
    await wrapper.find('.run-btn').trigger('click')
    await Promise.resolve()

    expect(workspaceStoreMock.createWorkspace).toHaveBeenCalledWith({
      root_path: '/home/autobyteus/team-workspace',
    })
    expect(teamStore.setWorkspaceLoaded).toHaveBeenCalledWith(
      'ws-created',
      '/home/autobyteus/team-workspace',
      expect.objectContaining({
        workspaceRootPath: '/home/autobyteus/team-workspace',
      }),
    )
    expect(teamRunOwnerState.launchDraft).toHaveBeenCalledTimes(1)
    expect(teamRunOwnerState.launchDraft).toHaveBeenCalledWith(teamStore.selectedDraft)
    expect(teamStore.selectedDraft.config.workspaceId).toBe('ws-created')
    expect(teamStore.clearConfig).not.toHaveBeenCalled()
  })

  it('disables team run and shows the blocking message when mixed-runtime readiness fails', async () => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    teamStore.config = { teamDefinitionId: 'team-def-1', workspaceId: 'ws-1' } as any
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
    teamStore.config = { teamDefinitionId: 'team-def-1', workspaceId: null } as any
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

    form.vm.$emit('select-existing', 'ws-draft-new')

    expect(agentStore.updateAgentConfig).toHaveBeenCalledWith({
      workspaceId: 'ws-draft-new',
      workspaceMetadata: null,
    })
    expect(agentStore.config?.workspaceId).toBe('ws-draft-new')
  })

  it('keeps draft team configuration editable for workspace selection events', async () => {
    const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore')
    const teamStore = useTeamRunConfigStore() as any
    teamStore.config = {
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Team team-def-1',
      workspaceId: 'ws-original',
      isLocked: false,
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    const form = wrapper.findComponent(TeamRunConfigForm)
    expect(form.props('readOnly')).toBe(false)

    form.vm.$emit('select-existing', 'ws-draft-new')

    expect(teamStore.applyConfigEdit).toHaveBeenCalledWith({
      kind: 'set_workspace',
      workspaceId: 'ws-draft-new',
      workspaceMetadata: null,
    })
    expect(teamStore.config?.workspaceId).toBe('ws-draft-new')
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

    form.vm.$emit('select-existing', 'ws-new')
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
    expect(form.props('readOnly')).toBe(true)
    expect(form.props('config')).toBe(topologyConfiguration)

    form.vm.$emit('select-existing', 'ws-new')
    form.vm.$emit('edit-config', { kind: 'set_model', llmModelIdentifier: 'changed-model' })
    expect(contextStore.activeTeamContext).toBe(activeContext)
    expect(contextStore.activeTeamContext.view.getConfigurationView()).toBe(topologyConfiguration)
    expect(topologyConfiguration.workspaceId).toBe('ws-original')
    expect(topologyConfiguration.llmModelIdentifier).toBe('test-model')
    expect(teamRunState.applyConfigEdit).not.toHaveBeenCalled()
  })
})
