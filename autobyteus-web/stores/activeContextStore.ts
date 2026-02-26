import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useAgentSelectionStore } from './agentSelectionStore';
import { useAgentContextsStore } from './agentContextsStore';
import { useAgentTeamContextsStore } from './agentTeamContextsStore';
import { useAgentRunStore } from './agentRunStore';
import { useAgentTeamRunStore } from './agentTeamRunStore';
import { useRunHistoryStore } from './runHistoryStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { ContextFilePath } from '~/types/conversation';

/**
 * @store useActiveContextStore
 * @description Facade for interacting with the currently active agent context
 * (single agent or focused team member) based on selection.
 */
export const useActiveContextStore = defineStore('activeContext', () => {
  const selectionStore = useAgentSelectionStore();
  const agentContextsStore = useAgentContextsStore();
  const agentTeamContextsStore = useAgentTeamContextsStore();
  const agentRunStore = useAgentRunStore();
  const agentTeamRunStore = useAgentTeamRunStore();
  const runHistoryStore = useRunHistoryStore();

  const activeAgentContext = computed<AgentContext | null>(() => {
    if (selectionStore.selectedType === 'agent') {
      return agentContextsStore.activeRun || null;
    }
    if (selectionStore.selectedType === 'team') {
      return agentTeamContextsStore.focusedMemberContext || null;
    }
    return null;
  });

  const isSending = computed<boolean>(() => activeAgentContext.value?.isSending ?? false);
  const currentRequirement = computed<string>(() => activeAgentContext.value?.requirement ?? '');
  const currentContextPaths = computed<ContextFilePath[]>(() => activeAgentContext.value?.contextFilePaths ?? []);
  const activeConfig = computed<AgentRunConfig | null>(() => activeAgentContext.value?.config ?? null);

  function _assertContext(context: AgentContext | null): asserts context is AgentContext {
    if (!context) {
      throw new Error('Operation failed: No active agent context.');
    }
  }

  const updateRequirement = (text: string) => {
    if (activeAgentContext.value) {
      activeAgentContext.value.requirement = text;
    }
  };

  const addContextFilePath = (filePath: ContextFilePath) => {
    if (activeAgentContext.value) {
      activeAgentContext.value.contextFilePaths.push(filePath);
    }
  };

  const removeContextFilePath = (index: number) => {
    if (activeAgentContext.value) {
      activeAgentContext.value.contextFilePaths.splice(index, 1);
    }
  };

  const clearContextFilePaths = () => {
    if (activeAgentContext.value) {
      activeAgentContext.value.contextFilePaths = [];
    }
  };

  const updateConfig = (configUpdate: Partial<AgentRunConfig>) => {
    const config = activeAgentContext.value?.config;
    if (!config || config.isLocked) {
      return;
    }

    if (selectionStore.selectedType !== 'agent' || !selectionStore.selectedRunId) {
      Object.assign(config, configUpdate);
      return;
    }

    const selectedRunId = selectionStore.selectedRunId;
    const editableFields = runHistoryStore.getEditableFields(selectedRunId);
    if (!editableFields) {
      Object.assign(config, configUpdate);
      return;
    }

    for (const [key, value] of Object.entries(configUpdate)) {
      const field = key as keyof AgentRunConfig;

      if (field === 'workspaceId' && !editableFields.workspaceRootPath) {
        continue;
      }
      if (field === 'llmModelIdentifier' && !editableFields.llmModelIdentifier) {
        continue;
      }
      if (field === 'llmConfig' && !editableFields.llmConfig) {
        continue;
      }
      if (field === 'autoExecuteTools' && !editableFields.autoExecuteTools) {
        continue;
      }
      if (field === 'skillAccessMode' && !editableFields.skillAccessMode) {
        continue;
      }

      (config as any)[field] = value;
    }
  };

  const postToolExecutionApproval = async (invocationId: string, isApproved: boolean, reason: string | null = null) => {
    const context = activeAgentContext.value;
    _assertContext(context);

    if (selectionStore.selectedType === 'agent') {
      await agentRunStore.postToolExecutionApproval(context.state.runId, invocationId, isApproved, reason);
    } else if (selectionStore.selectedType === 'team') {
      await agentTeamRunStore.postToolExecutionApproval(invocationId, isApproved, reason);
    } else {
      throw new Error('Cannot approve tool: Unknown selection type.');
    }
  };

  const send = async () => {
    const context = activeAgentContext.value;
    _assertContext(context);

    if (!context.requirement.trim()) {
      console.warn('Send action aborted: Requirement is empty.');
      return;
    }

    try {
      if (selectionStore.selectedType === 'agent') {
        await agentRunStore.sendUserInputAndSubscribe();
      } else if (selectionStore.selectedType === 'team') {
        await agentTeamRunStore.sendMessageToFocusedMember(context.requirement, context.contextFilePaths);
        context.requirement = '';
        context.contextFilePaths = [];
      } else {
        throw new Error('Cannot send: Unknown selection type.');
      }
    } catch (error) {
      console.error('Failed to send message via activeContextStore:', error);
      throw error;
    }
  };

  const stopGeneration = () => {
    const context = activeAgentContext.value;
    _assertContext(context);

    if (selectionStore.selectedType === 'agent') {
      return agentRunStore.stopGeneration(context.state.runId);
    }

    if (selectionStore.selectedType === 'team') {
      const activeTeamRunId = agentTeamContextsStore.activeTeamContext?.teamRunId;
      if (!activeTeamRunId) {
        throw new Error('Cannot stop generation: No active team context.');
      }
      return agentTeamRunStore.stopGeneration(activeTeamRunId);
    }

    throw new Error('Cannot stop generation: Unknown selection type.');
  };

  return {
    activeAgentContext,
    isSending,
    currentRequirement,
    currentContextPaths,
    activeConfig,
    updateRequirement,
    addContextFilePath,
    removeContextFilePath,
    clearContextFilePaths,
    updateConfig,
    postToolExecutionApproval,
    send,
    stopGeneration,
  };
});
