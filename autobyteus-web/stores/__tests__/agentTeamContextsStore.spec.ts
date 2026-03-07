import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useTeamWorkspaceViewStore } from '~/stores/teamWorkspaceViewStore';

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
                 autoExecuteTools: false,
                 memberOverrides: {
                     'agent-2': { agentDefinitionId: 'def-2', llmModelIdentifier: 'claude-3' }
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
             expect(agent1?.config.runtimeKind).toBe('autobyteus');
             
             const agent2 = team?.members.get('agent-2');
             expect(agent2?.config.llmModelIdentifier).toBe('claude-3'); // Override

             expect(selectionStore.selectedRunId).toBe(teamId);
             expect(selectionStore.selectedType).toBe('team');
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
                autoExecuteTools: false,
                memberOverrides: {},
            });

            await store.createRunFromTemplate();

             const [teamId] = Array.from(store.teams.keys());
             expect(store.activeTeamContext?.teamRunId).toBe(teamId);
        });
    });

    describe('setFocusedMember', () => {
        it('retargets unsent draft text and context files to the next focused member', () => {
            const store = useAgentTeamContextsStore();
            const selectionStore = useAgentSelectionStore();

            store.addTeamContext({
                teamRunId: 'team-1',
                config: {} as any,
                members: new Map([
                    ['agent-1', { requirement: 'draft text', contextFilePaths: [{ path: '/tmp/a.txt', type: 'Text' }] }],
                    ['agent-2', { requirement: '', contextFilePaths: [] }],
                ]) as any,
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
            expect(team.members.get('agent-1')?.requirement).toBe('');
            expect(team.members.get('agent-1')?.contextFilePaths).toEqual([]);
            expect(team.members.get('agent-2')?.requirement).toBe('draft text');
            expect(team.members.get('agent-2')?.contextFilePaths).toEqual([{ path: '/tmp/a.txt', type: 'Text' }]);
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
