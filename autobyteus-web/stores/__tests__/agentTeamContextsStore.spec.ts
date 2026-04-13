import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useTeamWorkspaceViewStore } from '~/stores/teamWorkspaceViewStore';

const {
    ensureHistoricalTeamMemberHydratedMock,
    ensureHistoricalTeamMembersHydratedMock,
} = vi.hoisted(() => ({
    ensureHistoricalTeamMemberHydratedMock: vi.fn().mockResolvedValue(undefined),
    ensureHistoricalTeamMembersHydratedMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/services/runHydration/teamRunContextHydrationService', () => ({
    ensureHistoricalTeamMemberHydrated: ensureHistoricalTeamMemberHydratedMock,
    ensureHistoricalTeamMembersHydrated: ensureHistoricalTeamMembersHydratedMock,
}));

// Mock dependencies
vi.mock('~/stores/agentTeamDefinitionStore', () => ({
    useAgentTeamDefinitionStore: () => ({
        getAgentTeamDefinitionById: (id: string) => {
            if (id === 'team-def-1') return {
                id: 'team-def-1',
                name: 'Test Team',
                coordinatorMemberName: 'agent-1',
                nodes: [
                    { memberName: 'agent-1', refType: 'AGENT', ref: 'def-1' },
                    { memberName: 'agent-2', refType: 'AGENT', ref: 'def-2' }
                ]
            };
            if (id === 'team-def-nested') return {
                id: 'team-def-nested',
                name: 'Nested Team',
                coordinatorMemberName: 'nested-group',
                nodes: [
                    { memberName: 'nested-group', refType: 'AGENT_TEAM', ref: 'sub-team-1' }
                ]
            };
            if (id === 'sub-team-1') return {
                id: 'sub-team-1',
                name: 'Sub Team',
                coordinatorMemberName: 'leaf-a',
                nodes: [
                    { memberName: 'leaf-a', refType: 'AGENT', ref: 'def-1' },
                    { memberName: 'leaf-b', refType: 'AGENT', ref: 'def-2' }
                ]
            };
            return null;
        }
    })
}));

vi.mock('~/stores/agentDefinitionStore', () => ({
    useAgentDefinitionStore: () => ({
        getAgentDefinitionById: (id: string) => ({ id, name: 'Agent ' + id })
    })
}));

describe('agentTeamContextsStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('createRunFromTemplate', () => {
        it('should create team context with members', async () => {
             const store = useAgentTeamContextsStore();
             const selectionStore = useAgentSelectionStore();
             const runConfigStore = useTeamRunConfigStore();

             runConfigStore.setTemplate({
                 id: 'team-def-1',
                 name: 'Test Team',
                 coordinatorMemberName: 'agent-1',
                 nodes: [
                     { memberName: 'agent-1', refType: 'AGENT', ref: 'def-1' },
                     { memberName: 'agent-2', refType: 'AGENT', ref: 'def-2' }
                 ]
             } as any);

             runConfigStore.updateConfig({
                 workspaceId: 'ws-1',
                 llmModelIdentifier: 'gpt-4',
                 llmConfig: { reasoning_effort: 'high' },
                 autoExecuteTools: false,
                 memberOverrides: {
                     'agent-2': {
                       agentDefinitionId: 'def-2',
                       llmModelIdentifier: 'claude-3',
                       llmConfig: { reasoning_effort: 'low' },
                     }
                 }
             });

             await store.createRunFromTemplate();

             const [teamId] = Array.from(store.teams.keys());
             expect(teamId).toMatch(/^temp-team-/);

             const team = store.teams.get(teamId!);
             expect(team).toBeDefined();
             expect(team?.members.size).toBe(2);
             
             const agent1 = team?.members.get('agent-1');
             expect(agent1?.config.agentDefinitionId).toBe('def-1');
             expect(agent1?.config.llmModelIdentifier).toBe('gpt-4'); // Inherited
             expect(agent1?.config.llmConfig).toEqual({ reasoning_effort: 'high' });
             expect(agent1?.config.runtimeKind).toBe('autobyteus');
             
             const agent2 = team?.members.get('agent-2');
             expect(agent2?.config.llmModelIdentifier).toBe('claude-3'); // Override
             expect(agent2?.config.llmConfig).toEqual({ reasoning_effort: 'low' });

             expect(selectionStore.selectedRunId).toBe(teamId);
             expect(selectionStore.selectedType).toBe('team');
        });

        it('should flatten nested team definitions into leaf member contexts', async () => {
             const store = useAgentTeamContextsStore();
             const runConfigStore = useTeamRunConfigStore();

             runConfigStore.setTemplate({
                 id: 'team-def-nested',
                 name: 'Nested Team',
                 coordinatorMemberName: 'nested-group',
                 nodes: [
                     { memberName: 'nested-group', refType: 'AGENT_TEAM', ref: 'sub-team-1' }
                 ]
             } as any);

             runConfigStore.updateConfig({
                 workspaceId: 'ws-1',
                 llmModelIdentifier: 'gpt-4',
                 llmConfig: null,
                 autoExecuteTools: false,
                 memberOverrides: {},
             });

             await store.createRunFromTemplate();

             const [teamId] = Array.from(store.teams.keys());
             const team = store.teams.get(teamId!);
             expect(team?.members.size).toBe(2);
             expect(team?.members.has('leaf-a')).toBe(true);
             expect(team?.members.has('leaf-b')).toBe(true);
             expect(team?.focusedMemberName).toBe('leaf-a');
         });
    });

    describe('activeTeamContext', () => {
        it('should return null if no team selected', () => {
            const store = useAgentTeamContextsStore();
            expect(store.activeTeamContext).toBeNull();
        });

        it('should return context if team selected', async () => {
            const store = useAgentTeamContextsStore();
            const runConfigStore = useTeamRunConfigStore();
            runConfigStore.setTemplate({
                id: 'team-def-1',
                name: 'Test Team',
                coordinatorMemberName: 'agent-1',
                nodes: [
                    { memberName: 'agent-1', refType: 'AGENT', ref: 'def-1' }
                ]
            } as any);
            runConfigStore.updateConfig({
                workspaceId: 'ws-1',
                llmModelIdentifier: 'gpt-4',
                llmConfig: null,
                autoExecuteTools: false,
                memberOverrides: {},
            });

            await store.createRunFromTemplate();

             const [teamId] = Array.from(store.teams.keys());
             expect(store.activeTeamContext?.teamRunId).toBe(teamId);
        });
    });

    describe('setFocusedMember', () => {
        it('keeps unsent draft text and context files on the original member', () => {
            const store = useAgentTeamContextsStore();
            const selectionStore = useAgentSelectionStore();

            store.addTeamContext({
                teamRunId: 'team-1',
                config: {} as any,
                members: new Map([
                    ['agent-1', { requirement: 'draft text', contextFilePaths: [{ kind: 'workspace_path', id: '/tmp/a.txt', locator: '/tmp/a.txt', displayName: 'a.txt', type: 'Text' }] }],
                    ['agent-2', { requirement: '', contextFilePaths: [] }],
                ]) as any,
                historicalHydration: null,
                focusedMemberName: 'agent-1',
                currentStatus: 'idle' as any,
                isSubscribed: false,
                taskPlan: null,
                taskStatuses: null,
            });

            selectionStore.selectRun('team-1', 'team');
            store.setFocusedMember('agent-2');

            const team = store.activeTeamContext!;
            expect(team.focusedMemberName).toBe('agent-2');
            expect(team.members.get('agent-1')?.requirement).toBe('draft text');
            expect(team.members.get('agent-1')?.contextFilePaths).toEqual([{ kind: 'workspace_path', id: '/tmp/a.txt', locator: '/tmp/a.txt', displayName: 'a.txt', type: 'Text' }]);
            expect(team.members.get('agent-2')?.requirement).toBe('');
            expect(team.members.get('agent-2')?.contextFilePaths).toEqual([]);
        });
    });

    describe('focusMemberAndEnsureHydrated', () => {
        it('focuses the requested member and triggers lazy historical hydration', async () => {
            const store = useAgentTeamContextsStore();
            const selectionStore = useAgentSelectionStore();

            store.addTeamContext({
                teamRunId: 'team-history-1',
                config: {} as any,
                members: new Map([
                    ['member-a', { requirement: '', contextFilePaths: [] }],
                    ['member-b', { requirement: '', contextFilePaths: [] }],
                ]) as any,
                historicalHydration: {
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    memberMetadataByRouteKey: {} as any,
                    memberProjectionLoadStateByRouteKey: {
                        'member-a': 'loaded',
                        'member-b': 'unloaded',
                    },
                },
                focusedMemberName: 'member-a',
                currentStatus: 'shutdown_complete' as any,
                isSubscribed: false,
                taskPlan: null,
                taskStatuses: null,
            });

            selectionStore.selectRun('team-history-1', 'team');

            await store.focusMemberAndEnsureHydrated('team-history-1', 'member-b');

            expect(store.activeTeamContext?.focusedMemberName).toBe('member-b');
            expect(ensureHistoricalTeamMemberHydratedMock).toHaveBeenCalledWith({
                teamContext: expect.objectContaining({ teamRunId: 'team-history-1' }),
                memberRouteKey: 'member-b',
            });
        });
    });

    describe('ensureHistoricalMembersHydratedForView', () => {
        it('hydrates all missing members when a historical team enters a broader mode', async () => {
            const store = useAgentTeamContextsStore();

            store.addTeamContext({
                teamRunId: 'team-history-1',
                config: {} as any,
                members: new Map([
                    ['member-a', {} as any],
                    ['member-b', {} as any],
                ]),
                historicalHydration: {
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    memberMetadataByRouteKey: {} as any,
                    memberProjectionLoadStateByRouteKey: {
                        'member-a': 'loaded',
                        'member-b': 'unloaded',
                    },
                },
                focusedMemberName: 'member-a',
                currentStatus: 'shutdown_complete' as any,
                isSubscribed: false,
                taskPlan: null,
                taskStatuses: null,
            });

            await store.ensureHistoricalMembersHydratedForView('team-history-1', 'grid');

            expect(ensureHistoricalTeamMembersHydratedMock).toHaveBeenCalledWith({
                teamContext: expect.objectContaining({ teamRunId: 'team-history-1' }),
                memberRouteKeys: ['member-a', 'member-b'],
            });
        });
    });

    describe('promoteTemporaryTeamRunId', () => {
        it('migrates the stored workspace view mode to the permanent team id', () => {
            const store = useAgentTeamContextsStore();
            const selectionStore = useAgentSelectionStore();
            const teamWorkspaceViewStore = useTeamWorkspaceViewStore();

            store.addTeamContext({
                teamRunId: 'temp-team-1',
                config: {} as any,
                members: new Map([['agent-1', { state: { conversation: { id: 'temp-team-1::agent-1' }, runId: 'temp-team-1::agent-1' } }]]) as any,
                historicalHydration: null,
                focusedMemberName: 'agent-1',
                currentStatus: 'idle' as any,
                isSubscribed: false,
                taskPlan: null,
                taskStatuses: null,
            });

            selectionStore.selectRun('temp-team-1', 'team');
            teamWorkspaceViewStore.setMode('temp-team-1', 'grid');

            store.promoteTemporaryTeamRunId('temp-team-1', 'team-1');

            expect(teamWorkspaceViewStore.getMode('temp-team-1')).toBe('focus');
            expect(teamWorkspaceViewStore.getMode('team-1')).toBe('grid');
            expect(store.activeTeamContext?.teamRunId).toBe('team-1');
        });
    });
});
