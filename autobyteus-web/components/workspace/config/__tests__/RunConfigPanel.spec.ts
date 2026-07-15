import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import RunConfigPanel from '../RunConfigPanel.vue'
import AgentRunConfigForm from '../AgentRunConfigForm.vue'
import TeamRunConfigForm from '../TeamRunConfigForm.vue'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'

const { agentRunState, teamRunState, agentContextState, teamContextState } = vi.hoisted(() => ({
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
    workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
    launchReadiness: { canLaunch: false, blockingIssues: [], unresolvedMembers: [] },
    updateConfig: vi.fn((patch: Record<string, unknown>) => {
      teamRunState.config = { ...(teamRunState.config || {}), ...patch } as any
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
    createRunFromTemplate: vi.fn(),
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
    teamRunState.updateConfig.mockClear()
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
    teamContextState.createRunFromTemplate.mockReset()
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
    teamStore.launchReadiness = { canLaunch: true, blockingIssues: [], unresolvedMembers: [] } as any

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    await wrapper.find('.run-btn').trigger('click')

    const { useAgentTeamContextsStore } = await import('~/stores/agentTeamContextsStore')
    const contextStore = useAgentTeamContextsStore() as any
    expect(contextStore.createRunFromTemplate).toHaveBeenCalled()
    expect(teamStore.clearConfig).toHaveBeenCalled()
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
    expect(teamContextState.createRunFromTemplate).toHaveBeenCalledTimes(1)
    expect(teamStore.clearConfig).toHaveBeenCalledTimes(1)
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

    expect(teamStore.updateConfig).toHaveBeenCalledWith({
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
    contextStore.activeTeamContext = {
      config: {
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Team team-def-1',
        workspaceId: 'ws-original',
        isLocked: false,
      },
    } as any

    const wrapper = mount(RunConfigPanel, {
      global: {
        stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true },
      },
    })

    const form = wrapper.findComponent(TeamRunConfigForm)
    expect(form.props('readOnly')).toBe(true)

    form.vm.$emit('select-existing', 'ws-new')
    expect(contextStore.activeTeamContext?.config.workspaceId).toBe('ws-original')
  })
})
