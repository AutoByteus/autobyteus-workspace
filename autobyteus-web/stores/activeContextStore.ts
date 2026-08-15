import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useAgentSelectionStore } from './agentSelectionStore';
import { useAgentContextsStore } from './agentContextsStore';
import { useAgentTeamContextsStore } from './agentTeamContextsStore';
import { useAgentRunStore } from './agentRunStore';
import { useAgentTeamRunStore } from './agentTeamRunStore';
import { useRunHistoryStore } from './runHistoryStore';
import { useContextFileUploadStore } from './contextFileUploadStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { ContextFilePath } from '~/types/conversation';
import type { ToolApprovalTarget } from '~/types/segments';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { resolveAgentPrimaryAction } from '~/services/runSubmission/agentPrimaryAction';

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
  const contextFileUploadStore = useContextFileUploadStore();

  const activeAgentContext = computed<AgentContext | null>(() => {
    if (selectionStore.selectedType === 'agent') {
      return agentContextsStore.activeRun || null;
    }
    if (selectionStore.selectedType === 'team') {
      const activeTeam = agentTeamContextsStore.activeTeamContext;
      if (!activeTeam) {
        return null;
      }

      return agentTeamContextsStore.activeExecutionFocusedMemberContext || null;
    }
    return null;
  });

  const submissionPending = computed<boolean>(() => activeAgentContext.value?.submissionPending ?? false);
  const currentStatus = computed<AgentStatus>(
    () => activeAgentContext.value?.state.currentStatus ?? AgentStatus.Offline,
  );
  const currentRequirement = computed<string>(() => activeAgentContext.value?.requirement ?? '');
  const currentContextPaths = computed<ContextFilePath[]>(() => activeAgentContext.value?.contextFilePaths ?? []);
  const activeConfig = computed<AgentRunConfig | null>(() => activeAgentContext.value?.config ?? null);

  function _assertContext(context: AgentContext | null): asserts context is AgentContext {
    if (!context) {
      throw new Error('Operation failed: No active agent context.');
    }
  }

  const updateRequirementForContext = (context: AgentContext | null, text: string) => {
    if (context) {
      context.requirement = text;
    }
  };

  const updateRequirement = (text: string) => {
    updateRequirementForContext(activeAgentContext.value, text);
  };

  const addContextFilePathForContext = (context: AgentContext | null, filePath: ContextFilePath) => {
    if (context) {
      context.contextFilePaths.push(filePath);
    }
  };

  const addContextFilePath = (filePath: ContextFilePath) => {
    addContextFilePathForContext(activeAgentContext.value, filePath);
  };

  const removeContextFilePathForContext = (context: AgentContext | null, index: number) => {
    if (context && index >= 0) {
      context.contextFilePaths.splice(index, 1);
    }
  };

  const removeContextFilePath = (index: number) => {
    removeContextFilePathForContext(activeAgentContext.value, index);
  };

  const clearContextFilePathsForContext = (context: AgentContext | null) => {
    if (context) {
      context.contextFilePaths = [];
    }
  };

  const clearContextFilePaths = () => {
    clearContextFilePathsForContext(activeAgentContext.value);
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
      if (field === 'workspaceMetadata' && !editableFields.workspaceRootPath) {
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

  const postToolExecutionApproval = async (
    invocationId: string,
    isApproved: boolean,
    reason: string | null = null,
    approvalTarget: ToolApprovalTarget | null = null,
  ) => {
    if (selectionStore.selectedType === 'agent') {
      const context = activeAgentContext.value;
      _assertContext(context);
      await agentRunStore.postToolExecutionApproval(context.state.runId, invocationId, isApproved, reason);
    } else if (selectionStore.selectedType === 'team') {
      await agentTeamRunStore.postToolExecutionApproval(invocationId, isApproved, reason, approvalTarget);
    } else {
      throw new Error('Cannot approve tool: Unknown selection type.');
    }
  };

  const send = async () => {
    const context = activeAgentContext.value;
    _assertContext(context);

    const action = resolveAgentPrimaryAction({
      hasContext: true,
      status: context.state.currentStatus,
      submissionPending: context.submissionPending,
      isUploading: contextFileUploadStore.isUploading,
      hasDraft: Boolean(context.requirement.trim()),
    });
    if (action.kind !== 'send') {
      console.warn(`Send action aborted: Primary action is '${action.kind}'.`);
      return;
    }

    try {
      if (selectionStore.selectedType === 'agent') {
        await agentRunStore.sendUserInputAndSubscribe();
      } else if (selectionStore.selectedType === 'team') {
        await agentTeamRunStore.sendMessageToFocusedMember(context.requirement, context.contextFilePaths);
      } else {
        throw new Error('Cannot send: Unknown selection type.');
      }
    } catch (error) {
      console.error('Failed to send message via activeContextStore:', error);
      throw error;
    }
  };

  const interruptGeneration = () => {
    const context = activeAgentContext.value;
    _assertContext(context);

    const action = resolveAgentPrimaryAction({
      hasContext: true,
      status: context.state.currentStatus,
      submissionPending: context.submissionPending,
      isUploading: contextFileUploadStore.isUploading,
      hasDraft: Boolean(context.requirement.trim()),
    });
    if (action.kind !== 'interrupt') {
      console.warn(`Interrupt action aborted: Primary action is '${action.kind}'.`);
      return;
    }

    if (selectionStore.selectedType === 'agent') {
      return agentRunStore.interruptGeneration(context.state.runId);
    }

    if (selectionStore.selectedType === 'team') {
      const activeTeam = agentTeamContextsStore.activeTeamContext;
      if (!activeTeam) {
        throw new Error('Cannot interrupt generation: No active team context.');
      }
      const agentRunId = activeTeam.view.getFocusedAgentRunId();
      const focusedMember = agentTeamContextsStore.activeExecutionFocusedMemberContext;
      if (!focusedMember || focusedMember !== context) {
        throw new Error('Cannot interrupt generation: Focused team member target is stale.');
      }
      return agentTeamRunStore.interruptFocusedMemberGeneration({
        teamRunId: activeTeam.view.getRootTeamRunId(),
        agentRunId,
      });
    }

    throw new Error('Cannot interrupt generation: Unknown selection type.');
  };

  return {
    activeAgentContext,
    submissionPending,
    currentStatus,
    currentRequirement,
    currentContextPaths,
    activeConfig,
    updateRequirementForContext,
    updateRequirement,
    addContextFilePathForContext,
    addContextFilePath,
    removeContextFilePathForContext,
    removeContextFilePath,
    clearContextFilePathsForContext,
    clearContextFilePaths,
    updateConfig,
    postToolExecutionApproval,
    send,
    interruptGeneration,
  };
});
