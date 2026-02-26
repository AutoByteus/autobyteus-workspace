import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAgentContextsStore } from '../agentContextsStore';
import { useAgentRunConfigStore } from '../agentRunConfigStore';
import { useAgentSelectionStore } from '../agentSelectionStore';
import type { AgentDefinition } from '../agentDefinitionStore';

// Mock AgentDefinition
const mockAgentDef: AgentDefinition = {
  id: 'def-1',
  name: 'TestAgent',
  role: 'assistant',
  description: 'Test Description',
  avatarUrl: '/rest/files/images/test-agent.png',
  toolNames: [],
  inputProcessorNames: [],
  llmResponseProcessorNames: [],
  systemPromptProcessorNames: [],
  toolExecutionResultProcessorNames: [],
  toolInvocationPreprocessorNames: [],
  lifecycleProcessorNames: [],
  skillNames: [],
  prompts: [],
};

describe('agentContextsStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('should initialize with empty runs', () => {
        const store = useAgentContextsStore();
        expect(store.runs.size).toBe(0);
        expect(store.activeRun).toBeUndefined();
    });

    describe('createRunFromTemplate', () => {
        it('should create a run from run config template', () => {
            const store = useAgentContextsStore();
            const configStore = useAgentRunConfigStore();
            const selectionStore = useAgentSelectionStore();

            // Setup template
            configStore.setTemplate(mockAgentDef);
            configStore.updateAgentConfig({
                llmModelIdentifier: 'gpt-4',
                workspaceId: 'ws-1',
                autoExecuteTools: true,
                skillAccessMode: 'GLOBAL_DISCOVERY',
                llmConfig: { reasoning_effort: 'high' },
            });

            // Create run
            const runId = store.createRunFromTemplate();

            // Verify run exists
            expect(runId).toMatch(/^temp-/);
            const runContext = store.runs.get(runId);
            expect(runContext).toBeDefined();

            // Verify config was copied
            expect(runContext?.config.agentDefinitionId).toBe('def-1');
            expect(runContext?.config.agentDefinitionName).toBe('TestAgent');
            expect(runContext?.config.agentAvatarUrl).toBe('/rest/files/images/test-agent.png');
            expect(runContext?.config.llmModelIdentifier).toBe('gpt-4');
            expect(runContext?.config.workspaceId).toBe('ws-1');
            expect(runContext?.config.autoExecuteTools).toBe(true);
            expect(runContext?.config.skillAccessMode).toBe('GLOBAL_DISCOVERY');
            expect(runContext?.config.llmConfig).toEqual({ reasoning_effort: 'high' });
            expect(runContext?.config.isLocked).toBe(false);

            // Verify selection was updated
            expect(selectionStore.selectedRunId).toBe(runId);
        });

        it('should throw error if no template exists', () => {
            const store = useAgentContextsStore();
            expect(() => store.createRunFromTemplate()).toThrowError("No run config template available");
        });
    });

    describe('removeRun', () => {
        it('should auto-select another run when removing the selected one', () => {
            const store = useAgentContextsStore();
            const configStore = useAgentRunConfigStore();
            const selectionStore = useAgentSelectionStore();

            configStore.setTemplate(mockAgentDef);
            const id1 = store.createRunFromTemplate();
            const id2 = store.createRunFromTemplate();

            // id2 is selected (most recently created)
            expect(selectionStore.selectedRunId).toBe(id2);

            store.removeRun(id2);

            expect(store.runs.has(id2)).toBe(false);
            // Should auto-select the remaining run
            expect(selectionStore.selectedRunId).toBe(id1);
            expect(selectionStore.selectedType).toBe('agent');
        });

        it('should clear selection when removing the only run', () => {
            const store = useAgentContextsStore();
            const configStore = useAgentRunConfigStore();
            const selectionStore = useAgentSelectionStore();

            configStore.setTemplate(mockAgentDef);
            const id = store.createRunFromTemplate();

            expect(store.runs.has(id)).toBe(true);
            expect(selectionStore.selectedRunId).toBe(id);

            store.removeRun(id);

            expect(store.runs.has(id)).toBe(false);
            expect(selectionStore.selectedRunId).toBeNull();
        });

        it('should not clear selection if removing a non-selected run', () => {
            const store = useAgentContextsStore();
            const configStore = useAgentRunConfigStore();
            const selectionStore = useAgentSelectionStore();

            configStore.setTemplate(mockAgentDef);
            const id1 = store.createRunFromTemplate();
            const id2 = store.createRunFromTemplate();

            // Select id2
            selectionStore.selectRun(id2);

            store.removeRun(id1);

            expect(store.runs.has(id1)).toBe(false);
            expect(selectionStore.selectedRunId).toBe(id2);
        });
    });

    describe('lockConfig', () => {
        it('should lock the configuration of a run', () => {
            const store = useAgentContextsStore();
            const configStore = useAgentRunConfigStore();
            
            configStore.setTemplate(mockAgentDef);
            const id = store.createRunFromTemplate();

            const runContext = store.runs.get(id);
            expect(runContext?.config.isLocked).toBe(false);

            store.lockConfig(id);

            expect(runContext?.config.isLocked).toBe(true);
        });
    });

    describe('promoteTemporaryId', () => {
        it('should replace active run ID with permanent one', () => {
            const store = useAgentContextsStore();
            const configStore = useAgentRunConfigStore();
            const selectionStore = useAgentSelectionStore();
            
            configStore.setTemplate(mockAgentDef);
            const tempId = store.createRunFromTemplate();
            const permId = 'perm-123';

            store.promoteTemporaryId(tempId, permId);

            expect(store.runs.has(tempId)).toBe(false);
            expect(store.runs.has(permId)).toBe(true);
            
            // Verify content preserved
            const runContext = store.runs.get(permId);
            expect(runContext?.config.agentDefinitionId).toBe('def-1');
            expect(runContext?.state.agentId).toBe(permId);

            // Verify selection updated
            expect(selectionStore.selectedRunId).toBe(permId);
        });
    });

    describe('activeRun getter', () => {
        it('should return the currently selected run', () => {
            const store = useAgentContextsStore();
            const configStore = useAgentRunConfigStore();
            const selectionStore = useAgentSelectionStore();
            
            configStore.setTemplate(mockAgentDef);
            const id = store.createRunFromTemplate();

            expect(store.activeRun).toBeDefined();
            expect(store.activeRun?.state.agentId).toBe(id);

            selectionStore.clearSelection();
            expect(store.activeRun).toBeUndefined();
        });
    });
});
