import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import RunConfigPanel from '../RunConfigPanel.vue';
import AgentRunConfigForm from '../AgentRunConfigForm.vue';
import TeamRunConfigForm from '../TeamRunConfigForm.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';

// Hoisted state objects
const { agentRunState, teamRunState, agentContextState, teamContextState, runTreeState, teamDefinitionsById } = vi.hoisted(() => ({
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
    },
    runTreeState: {
        isWorkspaceLockedForRun: vi.fn(() => false),
        markTeamDraftProjectionDirty: vi.fn(),
    },
    teamDefinitionsById: {} as Record<string, any>,
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

vi.mock('~/stores/runTreeStore', async () => {
    const { reactive } = await import('vue');
    return { useRunTreeStore: () => reactive(runTreeState) };
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
    getAgentTeamDefinitionById: (id: string) => teamDefinitionsById[id] ?? ({ id, name: 'Team ' + id, nodes: [] })
  })
}));

describe('RunConfigPanel', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        // Reset manual states
        agentRunState.config = null;
        teamRunState.config = null;
        agentContextState.activeRun = null;
        teamContextState.activeTeamContext = null;
        Object.keys(teamDefinitionsById).forEach((key) => delete teamDefinitionsById[key]);
        runTreeState.isWorkspaceLockedForRun.mockClear();
        runTreeState.markTeamDraftProjectionDirty.mockClear();
        agentContextState.createRunFromTemplate.mockClear();
        teamContextState.createRunFromTemplate.mockClear();
        agentRunState.setWorkspaceError.mockClear();
        teamRunState.setWorkspaceError.mockClear();
        agentRunState.clearConfig.mockClear();
        teamRunState.clearConfig.mockClear();
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
        store.config = {
            teamDefinitionId: 'team-def-1',
            teamDefinitionName: 'Team team-def-1',
            workspaceId: null,
            llmModelIdentifier: '',
            autoExecuteTools: false,
            memberOverrides: {},
            isLocked: false,
        } as any;
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

    it('renders Team Form when Team Run selected', async () => {
        const selectionStore = useAgentSelectionStore();
        selectionStore.selectRun('team-1', 'team');
        
        const { useAgentTeamContextsStore } = await import('~/stores/agentTeamContextsStore');
        const store = useAgentTeamContextsStore();
        store.activeTeamContext = {
            config: {
                teamDefinitionId: 'team-def-1',
                teamDefinitionName: 'Team team-def-1',
                workspaceId: null,
                llmModelIdentifier: '',
                autoExecuteTools: false,
                memberOverrides: {},
                isLocked: false,
            },
            teamId: 'team-1'
        } as any;

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
         teamStore.config = {
            teamDefinitionId: 'team-def-1',
            teamDefinitionName: 'Team team-def-1',
            workspaceId: 'ws-1',
            llmModelIdentifier: '',
            autoExecuteTools: false,
            memberOverrides: {},
            isLocked: false,
         } as any;
         teamStore.isConfigured = true;
         teamDefinitionsById['team-def-1'] = {
            id: 'team-def-1',
            name: 'Team team-def-1',
            nodes: [{ memberName: 'coordinator', referenceType: 'AGENT', referenceId: 'agent-coordinator', homeNodeId: 'embedded-local' }],
         };
         
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
        expect(runTreeState.markTeamDraftProjectionDirty).toHaveBeenCalledTimes(1);
    });

    it('blocks team run when remote member workspace path is missing', async () => {
        const { useTeamRunConfigStore } = await import('~/stores/teamRunConfigStore');
        const { useAgentTeamContextsStore } = await import('~/stores/agentTeamContextsStore');
        const teamStore = useTeamRunConfigStore();
        const teamContexts = useAgentTeamContextsStore();
        teamStore.config = {
            teamDefinitionId: 'team-def-remote',
            teamDefinitionName: 'Remote Team',
            workspaceId: 'ws-host',
            llmModelIdentifier: '',
            autoExecuteTools: false,
            memberOverrides: {},
            isLocked: false,
        } as any;
        teamStore.isConfigured = true;
        teamDefinitionsById['team-def-remote'] = {
            id: 'team-def-remote',
            name: 'Remote Team',
            nodes: [
                { memberName: 'professor', referenceType: 'AGENT', referenceId: 'agent-professor', homeNodeId: 'embedded-local' },
                { memberName: 'student', referenceType: 'AGENT', referenceId: 'agent-student', homeNodeId: 'node-docker-8001' },
            ],
        };

        const wrapper = mount(RunConfigPanel, {
            global: {
                stubs: { AgentRunConfigForm: true, TeamRunConfigForm: true }
            }
        });

        expect(wrapper.text()).toContain('Remote workspace path required for: student.');
        expect(wrapper.find('.run-btn').attributes('disabled')).toBeDefined();

        expect(teamContexts.createRunFromTemplate).not.toHaveBeenCalled();
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
});
