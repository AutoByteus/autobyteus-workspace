import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import type { AgentDefinition } from '../agentDefinitionStore';

const mockAgentDef: AgentDefinition = {
  id: 'agent-def-1',
  name: 'SuperAgent',
  role: 'assistant',
  description: 'A super helpful agent',
  avatarUrl: '/rest/files/images/super-agent.png',
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

describe('agentRunConfigStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('setTemplate', () => {
    it('should set agent config from definition with defaults', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);

      expect(store.config?.agentDefinitionId).toBe('agent-def-1');
      expect(store.config?.agentDefinitionName).toBe('SuperAgent');
      expect(store.config?.agentAvatarUrl).toBe('/rest/files/images/super-agent.png');
      expect(store.config?.llmModelIdentifier).toBe('');
      expect(store.config?.workspaceId).toBeNull();
      expect(store.config?.autoExecuteTools).toBe(false);
      expect(store.config?.skillAccessMode).toBe('PRELOADED_ONLY');
      expect(store.config?.isLocked).toBe(false);
    });

    it('should initialize workspace loading state', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);

      expect(store.workspaceLoadingState.isLoading).toBe(false);
      expect(store.workspaceLoadingState.error).toBeNull();
      expect(store.workspaceLoadingState.loadedPath).toBeNull();
    });

    it('should reset panel state', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);

      expect(store.isPanelExpanded).toBe(true);
      expect(store.hasFirstMessageSent).toBe(false);
    });
  });

  describe('updateAgentConfig', () => {
    it('should update config fields', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);

      store.updateAgentConfig({
        llmModelIdentifier: 'gpt-4-turbo',
        autoExecuteTools: true,
        skillAccessMode: 'GLOBAL_DISCOVERY',
      });

      expect(store.config?.llmModelIdentifier).toBe('gpt-4-turbo');
      expect(store.config?.autoExecuteTools).toBe(true);
      expect(store.config?.skillAccessMode).toBe('GLOBAL_DISCOVERY');
    });
  });

  describe('workspace loading', () => {
    it('should track loading state', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);

      store.setWorkspaceLoading(true);

      expect(store.workspaceLoadingState.isLoading).toBe(true);
      expect(store.workspaceLoadingState.error).toBeNull();
    });

    it('should handle successful load', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);

      store.setWorkspaceLoading(true);
      store.setWorkspaceLoaded('ws-123', '/home/user/project');

      expect(store.workspaceLoadingState.isLoading).toBe(false);
      expect(store.workspaceLoadingState.loadedPath).toBe('/home/user/project');
      expect(store.config?.workspaceId).toBe('ws-123');
    });

    it('should handle load error', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);

      store.setWorkspaceLoading(true);
      store.setWorkspaceError('Path not found');

      expect(store.workspaceLoadingState.isLoading).toBe(false);
      expect(store.workspaceLoadingState.error).toBe('Path not found');
    });

    it('should clear workspace state', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);
      store.setWorkspaceLoaded('ws-123', '/path');

      store.clearWorkspaceState();

      expect(store.workspaceLoadingState.loadedPath).toBeNull();
      expect(store.config?.workspaceId).toBeNull();
    });
  });

  describe('panel state', () => {
    it('should toggle panel', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);

      expect(store.isPanelExpanded).toBe(true);
      store.togglePanel();
      expect(store.isPanelExpanded).toBe(false);
      store.togglePanel();
      expect(store.isPanelExpanded).toBe(true);
    });

    it('should collapse after first message', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);

      store.markFirstMessageSent();

      expect(store.hasFirstMessageSent).toBe(true);
      expect(store.isPanelExpanded).toBe(false);
    });
  });

  describe('isConfigured getter', () => {
    it('should return false if no model selected', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);
      store.updateAgentConfig({ workspaceId: 'ws-1' });

      expect(store.isConfigured).toBe(false);
    });

    it('should return false if workspace is missing', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);
      store.updateAgentConfig({ llmModelIdentifier: 'gpt-4' });

      expect(store.isConfigured).toBe(false);
    });

    it('should return true if model and workspace are selected', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);
      store.updateAgentConfig({ llmModelIdentifier: 'gpt-4', workspaceId: 'ws-1' });

      expect(store.isConfigured).toBe(true);
    });
  });

  describe('hasConfig getter', () => {
    it('should return false initially', () => {
      const store = useAgentRunConfigStore();
      expect(store.hasConfig).toBe(false);
    });

    it('should return true after setting template', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);
      expect(store.hasConfig).toBe(true);
    });
  });

  describe('clearConfig', () => {
    it('should reset all state', () => {
      const store = useAgentRunConfigStore();
      store.setTemplate(mockAgentDef);
      store.updateAgentConfig({ llmModelIdentifier: 'gpt-4' });
      store.setWorkspaceLoaded('ws-123', '/path');
      store.markFirstMessageSent();

      store.clearConfig();

      expect(store.config).toBeNull();
      expect(store.isPanelExpanded).toBe(true);
      expect(store.hasFirstMessageSent).toBe(false);
      expect(store.workspaceLoadingState.loadedPath).toBeNull();
    });
  });
});
