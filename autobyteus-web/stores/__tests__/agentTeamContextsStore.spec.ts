import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';

// Mock dependencies
vi.mock('~/stores/agentTeamDefinitionStore', () => ({
    useAgentTeamDefinitionStore: () => ({
        getAgentTeamDefinitionById: (id: string) => {
            if (id === 'team-def-1') return {
                id: 'team-def-1',
                name: 'Test Team',
                coordinatorMemberName: 'agent-1',
                nodes: [
                    { memberName: 'agent-1', referenceType: 'AGENT', referenceId: 'def-1' },
                    { memberName: 'agent-2', referenceType: 'AGENT', referenceId: 'def-2' }
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
                     { memberName: 'agent-1', referenceType: 'AGENT', referenceId: 'def-1' },
                     { memberName: 'agent-2', referenceType: 'AGENT', referenceId: 'def-2' }
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
                    { memberName: 'agent-1', referenceType: 'AGENT', referenceId: 'def-1' }
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
});
