import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import RunConfigPanel from '../RunConfigPanel.vue';
import AgentRunConfigForm from '../AgentRunConfigForm.vue';
import TeamRunConfigForm from '../TeamRunConfigForm.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';

// Hoisted state objects
const { agentRunState, teamRunState, agentContextState, teamContextState } = vi.hoisted(() => ({
    agentRunState: {
        config: null,
        workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
        isConfigured: false,
        setWorkspaceLoading: vi.fn(),
        setWorkspaceLoaded: vi.fn(),
        setWorkspaceError: vi.fn(),
        clearConfig: vi.fn()
    },
    teamRunState: {
        config: null,
        workspaceLoadingState: { isLoading: false, error: null, loadedPath: null },
        isConfigured: false,
        setWorkspaceLoading: vi.fn(),
        setWorkspaceLoaded: vi.fn(),
        setWorkspaceError: vi.fn(),
        clearConfig: vi.fn()
    },
    agentContextState: {
        activeRun: null,
        createRunFromTemplate: vi.fn()
    },
    teamContextState: {
        activeTeamContext: null,
        createRunFromTemplate: vi.fn()
    }
}));
const { workspaceCenterViewStoreMock } = vi.hoisted(() => ({
    workspaceCenterViewStoreMock: {
        showChat: vi.fn(),
    },
}));

// Mocks
vi.mock('~/stores/agentRunConfigStore', async () => {
    const { reactive } = await import('vue');
    return { useAgentRunConfigStore: () => reactive(agentRunState) };
});

vi.mock('~/stores/teamRunConfigStore', async () => {
    const { reactive } = await import('vue');
    return { useTeamRunConfigStore: () => reactive(teamRunState) };
});

vi.mock('~/stores/agentContextsStore', async () => {
    const { reactive } = await import('vue');
    return { useAgentContextsStore: () => reactive(agentContextState) };
});

vi.mock('~/stores/agentTeamContextsStore', async () => {
    const { reactive } = await import('vue');
    return { useAgentTeamContextsStore: () => reactive(teamContextState) };
});

vi.mock('~/stores/workspace', () => ({
    useWorkspaceStore: () => ({
        createWorkspace: vi.fn(),
        workspaces: {},
        allWorkspaces: [],
        tempWorkspaceId: null,
        tempWorkspace: null,
        fetchAllWorkspaces: vi.fn().mockResolvedValue([]),
    })
}));

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({
    getAgentDefinitionById: (id: string) => ({ id, name: 'Agent ' + id })
  })
}));

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => ({
    getAgentTeamDefinitionById: (id: string) => ({ id, name: 'Team ' + id, nodes: [] })
  })
}));

vi.mock('~/stores/workspaceCenterViewStore', () => ({
    useWorkspaceCenterViewStore: () => workspaceCenterViewStoreMock,
}));

describe('RunConfigPanel', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        workspaceCenterViewStoreMock.showChat.mockReset();
        // Reset manual states
        agentRunState.config = null;
        teamRunState.config = null;
        agentContextState.activeRun = null;
        teamContextState.activeTeamContext = null;
    });

    it('renders placeholder when nothing selected', () => {
        const wrapper = mount(RunConfigPanel, {
            global: {
                stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true }
            }
        });
        expect(wrapper.text()).toContain('Select an agent or team');
    });

    it('renders Agent Form when Agent Template set', async () => {
        const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore');
        const store = useAgentRunConfigStore();
        store.config = { agentDefinitionId: 'def-1', workspaceId: null } as any;
        store.isConfigured = true;

        const wrapper = mount(RunConfigPanel, {
            global: {
                stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true }
            }
        });

        expect(wrapper.findComponent(AgentRunConfigForm).exists()).toBe(true);
    });

    it('renders Team Form when Team Template set', async () => {
        const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore');
        const store = useTeamRunConfigStore();
        store.config = { teamDefinitionId: 'team-def-1', workspaceId: null } as any;
        store.isConfigured = true;
        
        const selectionStore = useAgentSelectionStore();
        selectionStore.clearSelection();

        const wrapper = mount(RunConfigPanel, {
            global: {
                stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true }
            }
        });

        expect(wrapper.findComponent(TeamRunConfigForm).exists()).toBe(true);
    });

    it('renders Team Form when Team Instance selected', async () => {
        const selectionStore = useAgentSelectionStore();
        selectionStore.selectRun('team-1', 'team');
        
        const { useAgentTeamContextsStore } = await import('~/stores/agentTeamContextsStore');
        const store = useAgentTeamContextsStore();
        store.activeTeamContext = { config: { teamDefinitionId: 'team-def-1' }, teamRunId: 'team-1' } as any;

        const wrapper = mount(RunConfigPanel, {
            global: {
                stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true }
            }
        });

        expect(wrapper.findComponent(TeamRunConfigForm).exists()).toBe(true);
    });

    it('triggers team run on button click', async () => {
         const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore');
         const teamStore = useTeamRunConfigStore();
         teamStore.config = { teamDefinitionId: 'team-def-1', workspaceId: 'ws-1' } as any;
         teamStore.isConfigured = true;
         
         const wrapper = mount(RunConfigPanel, {
            global: {
                stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true }
            }
        });

        await wrapper.find('.run-btn').trigger('click');
        
        // Check create call
        const { useAgentTeamContextsStore } = await import('~/stores/agentTeamContextsStore');
        const contextStore = useAgentTeamContextsStore();
        expect(contextStore.createRunFromTemplate).toHaveBeenCalled();
        expect(teamStore.clearConfig).toHaveBeenCalled();
    });

    it('blocks team run when workspace is missing (defensive path)', async () => {
         const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore');
         const teamStore = useTeamRunConfigStore();
         teamStore.config = { teamDefinitionId: 'team-def-1', workspaceId: null } as any;
         teamStore.isConfigured = true;
         const { useAgentTeamContextsStore } = await import('~/stores/agentTeamContextsStore');
         const contextStore = useAgentTeamContextsStore();
         const callsBefore = contextStore.createRunFromTemplate.mock.calls.length;

         const wrapper = mount(RunConfigPanel, {
            global: {
                stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true }
            }
        });

        await wrapper.find('.run-btn').trigger('click');

        expect(contextStore.createRunFromTemplate.mock.calls.length).toBe(callsBefore);
        expect(teamStore.setWorkspaceError).toHaveBeenCalledWith('Workspace is required to run a team.');
    });

    it('blocks agent run when workspace is missing (defensive path)', async () => {
        const { useAgentRunConfigStore } = await import('~/stores/agentRunConfigStore');
        const agentStore = useAgentRunConfigStore();
        agentStore.config = {
            agentDefinitionId: 'def-1',
            agentDefinitionName: 'Agent def-1',
            workspaceId: null,
            isLocked: false,
        } as any;
        agentStore.isConfigured = true;

        const wrapper = mount(RunConfigPanel, {
            global: {
                stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true }
            }
        });

        await wrapper.find('.run-btn').trigger('click');

        const { useAgentContextsStore } = await import('~/stores/agentContextsStore');
        const contextStore = useAgentContextsStore();
        expect(contextStore.createRunFromTemplate).not.toHaveBeenCalled();
        expect(agentStore.setWorkspaceError).toHaveBeenCalledWith('Workspace is required to run an agent.');
    });

    it('returns to event view from selection-mode config header action', async () => {
        const selectionStore = useAgentSelectionStore();
        selectionStore.selectRun('run-1', 'agent');

        const { useAgentContextsStore } = await import('~/stores/agentContextsStore');
        const contextStore = useAgentContextsStore();
        contextStore.activeRun = {
          config: {
            agentDefinitionId: 'def-1',
            agentDefinitionName: 'Agent def-1',
            workspaceId: 'ws-1',
            isLocked: false,
          },
        } as any;

        const wrapper = mount(RunConfigPanel, {
            global: {
                stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true }
            }
        });

        const backButton = wrapper.find('[data-test="run-config-back-to-events"]');
        expect(backButton.exists()).toBe(true);
        expect(backButton.attributes('aria-label')).toBe('Back to event view');

        const beforeClickCalls = workspaceCenterViewStoreMock.showChat.mock.calls.length;
        await backButton.trigger('click');
        expect(workspaceCenterViewStoreMock.showChat).toHaveBeenCalledTimes(beforeClickCalls + 1);
    });
});
