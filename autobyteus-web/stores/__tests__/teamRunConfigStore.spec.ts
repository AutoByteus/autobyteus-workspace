import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import type { AgentTeamDefinition } from '../agentTeamDefinitionStore';

const mockTeamDef: AgentTeamDefinition = {
  id: 'team-def-1',
  name: 'Research Team',
  description: 'Test Team',
  coordinatorMemberName: 'coord',
  role: 'assistant',
  nodes: [],
} as any;

describe('teamRunConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('setTemplate', () => {
    it('should set team config from definition with defaults', () => {
      const store = useTeamRunConfigStore();
      store.setTemplate(mockTeamDef);

      expect(store.config?.teamDefinitionId).toBe('team-def-1');
      expect(store.config?.teamDefinitionName).toBe('Research Team');
      expect(store.config?.llmModelIdentifier).toBe('');
      expect(store.config?.workspaceId).toBeNull();
      expect(store.config?.autoExecuteTools).toBe(false);
      expect(store.config?.memberOverrides).toEqual({});
      expect(store.config?.isLocked).toBe(false);
    });

    it('should initialize workspace loading state', () => {
      const store = useTeamRunConfigStore();
      store.setTemplate(mockTeamDef);

      expect(store.workspaceLoadingState.isLoading).toBe(false);
      expect(store.workspaceLoadingState.error).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('should update config fields', () => {
      const store = useTeamRunConfigStore();
      store.setTemplate(mockTeamDef);

      store.updateConfig({
        llmModelIdentifier: 'gpt-4-turbo',
        autoExecuteTools: true,
      });

      expect(store.config?.llmModelIdentifier).toBe('gpt-4-turbo');
      expect(store.config?.autoExecuteTools).toBe(true);
    });
  });

  describe('hasConfig getter', () => {
    it('should return false initially', () => {
      const store = useTeamRunConfigStore();
      expect(store.hasConfig).toBe(false);
    });

    it('should return true after setting template', () => {
      const store = useTeamRunConfigStore();
      store.setTemplate(mockTeamDef);
      expect(store.hasConfig).toBe(true);
    });
  });

  describe('clearConfig', () => {
    it('should reset all state', () => {
      const store = useTeamRunConfigStore();
      store.setTemplate(mockTeamDef);
      store.updateConfig({ llmModelIdentifier: 'gpt-4' });

      store.clearConfig();

      expect(store.config).toBeNull();
    });
  });
});
