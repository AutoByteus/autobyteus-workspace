import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient'
import { CreateAgentRun, RestoreAgentRun, TerminateAgentRun } from '~/graphql/mutations/agentMutations';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { AgentStreamingService } from '~/services/agentStreaming';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { resolveRunnableModelIdentifier } from '~/utils/runLaunchPolicy';
import { partitionContextAttachmentsForStreaming } from '~/utils/contextFiles/contextAttachmentSend';
import {
  buildAgentDraftContextFileOwner,
  buildAgentFinalContextFileOwner,
} from '~/utils/contextFiles/contextFileOwner';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { ConnectionState } from '~/services/agentStreaming';

interface CreateAgentRunMutationResultPayload {
  createAgentRun: {
    success: boolean;
    message: string;
    runId?: string | null;
  };
}

interface RestoreAgentRunMutationResultPayload {
  restoreAgentRun: {
    success: boolean;
    message: string;
    runId?: string | null;
  };
}

// Maintain a map of streaming services per agent
const streamingServices = new Map<string, AgentStreamingService>();

/**
 * @store agentRun
 * @description This store orchestrates single-agent lifecycle and streaming.
 * GraphQL creates new runs; WebSocket handles the first and subsequent messages.
 */
export const useAgentRunStore = defineStore('agentRun', {
  state: () => ({}),
  getters: {},

  actions: {
    /**
     * @action sendUserInputAndSubscribe
     * @description Creates a new agent run when needed, then sends the user's message over
     * WebSocket and keeps the stream connected for live updates.
     */
    async sendUserInputAndSubscribe(): Promise<void> {
      const agentContextsStore = useAgentContextsStore();
      const runHistoryStore = useRunHistoryStore();
      const workspaceStore = useWorkspaceStore();
      const contextFileUploadStore = useContextFileUploadStore();
      const currentAgent = agentContextsStore.activeRun;

      if (!currentAgent) {
        throw new Error('No active agent selected.');
      }

      const { config, state } = currentAgent;
      const runId = state.runId;
      const isNewAgent = runId.startsWith('temp-');
      const resumeConfig = !isNewAgent ? runHistoryStore.getResumeConfig(runId) : null;
      const workspaceId = config.workspaceId;
      const workspaceRootPath = workspaceId
        ? (
            workspaceStore.workspaces[workspaceId]?.absolutePath
            || workspaceStore.workspaces[workspaceId]?.workspaceConfig?.root_path
            || workspaceStore.workspaces[workspaceId]?.workspaceConfig?.rootPath
            || null
          )
        : (resumeConfig?.metadataConfig.workspaceRootPath || null);

      if (isNewAgent && !config.llmModelIdentifier) {
        const llmProviderConfigStore = useLLMProviderConfigStore();
        config.llmModelIdentifier = await resolveRunnableModelIdentifier({
          candidateModels: [config.llmModelIdentifier],
          getKnownModels: () => llmProviderConfigStore.models,
          ensureModelsLoaded: async () => {
            await llmProviderConfigStore.fetchProvidersWithModels(
              config.runtimeKind ?? DEFAULT_AGENT_RUNTIME_KIND,
            );
          },
        });
      }

      if (isNewAgent && !config.llmModelIdentifier) {
        throw new Error("Please select a model for the first message.");
      }
      if (isNewAgent && !workspaceRootPath) {
        throw new Error("A workspace root path is required for the first message.");
      }
      if (isNewAgent && !config.skillAccessMode) {
        throw new Error("A skill access mode is required for the first message.");
      }
      if (isNewAgent && !config.runtimeKind) {
        throw new Error("A runtime kind is required for the first message.");
      }

      if (isNewAgent) {
        state.conversation.llmModelIdentifier = config.llmModelIdentifier;
      }
      const messageContent = currentAgent.requirement;
      const draftAttachments = [...currentAgent.contextFilePaths];
      const draftOwner = buildAgentDraftContextFileOwner(runId);

      currentAgent.isSending = true;

      try {
        let finalRunId = runId;
        if (isNewAgent) {
          const client = getApolloClient()
          const { data, errors } = await client.mutate<CreateAgentRunMutationResultPayload>({
            mutation: CreateAgentRun,
            variables: {
              input: {
                agentDefinitionId: state.conversation.agentDefinitionId,
                workspaceId: workspaceId ?? undefined,
                workspaceRootPath,
                llmModelIdentifier: config.llmModelIdentifier,
                autoExecuteTools: config.autoExecuteTools,
                llmConfig: config.llmConfig ?? null,
                skillAccessMode: config.skillAccessMode,
                runtimeKind: config.runtimeKind,
              }
            }
          });

          if (errors && errors.length > 0) {
            throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
          }

          const result = data?.createAgentRun;
          if (!result) {
            throw new Error('Failed to create agent run: No response returned.');
          }

          if (!result.success) {
            throw new Error(result.message || 'Failed to create agent run.');
          }

          const permanentRunId = result.runId;
          if (!permanentRunId) {
            throw new Error('Failed to create agent run: No runId returned on success.');
          }

          finalRunId = permanentRunId;
          agentContextsStore.promoteTemporaryId(runId, permanentRunId);
        } else if (resumeConfig && !resumeConfig.isActive) {
          const client = getApolloClient();
          const { data, errors } = await client.mutate<RestoreAgentRunMutationResultPayload>({
            mutation: RestoreAgentRun,
            variables: { agentRunId: finalRunId },
          });

          if (errors && errors.length > 0) {
            throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
          }

          const result = data?.restoreAgentRun;
          if (!result) {
            throw new Error('Failed to restore agent run: No response returned.');
          }
          if (!result.success) {
            throw new Error(result.message || 'Failed to restore agent run.');
          }

          finalRunId = result.runId || finalRunId;
        }

        agentContextsStore.lockConfig(finalRunId);
        runHistoryStore.markRunAsActive(finalRunId);
        runHistoryStore.refreshTreeQuietly();

        const finalizedAttachments = await contextFileUploadStore.finalizeDraftAttachments({
          draftOwner,
          finalOwner: buildAgentFinalContextFileOwner(finalRunId),
          attachments: draftAttachments,
        });

        const finalAgent = agentContextsStore.getRun(finalRunId)!;
        finalAgent.state.conversation.messages.push({
          type: 'user',
          text: messageContent,
          timestamp: new Date(),
          contextFilePaths: finalizedAttachments,
        });
        finalAgent.state.conversation.updatedAt = new Date().toISOString();
        finalAgent.requirement = '';
        finalAgent.contextFilePaths = [];

        const service = await this.ensureAgentStreamConnected(finalRunId);
        const streamPayload = partitionContextAttachmentsForStreaming(finalizedAttachments);
        service.sendMessage(messageContent, streamPayload.contextFilePaths, streamPayload.imageUrls);
      } catch (error: any) {
        console.error('Error sending user input:', error);
        currentAgent.isSending = false;

        // Push error segment to conversation
        currentAgent.state.conversation.messages.push({
          type: 'ai',
          text: 'Error Occurred',
          timestamp: new Date(),
          isComplete: true,
          segments: [{
            type: 'error',
            source: 'System',
            message: error.message || 'An unexpected error occurred.',
            details: error.toString()
          }]
        });
        currentAgent.state.conversation.updatedAt = new Date().toISOString();

        // We do NOT re-throw here because we've handled it by showing it in the UI.
        // If we re-throw, parent catch blocks might try to handle it again (e.g. log it).
      }
    },

    /**
     * @action connectToAgentStream
     * @description Establishes a WebSocket connection to receive real-time events for a specific run.
     */
    connectToAgentStream(runId: string): AgentStreamingService | null {
      const agentContextsStore = useAgentContextsStore();
      const agent = agentContextsStore.getRun(runId);

      if (!agent) return null;

      const existingService = streamingServices.get(runId);
      if (existingService) {
        existingService.attachContext(agent);
        agent.unsubscribe = () => {
          existingService.disconnect();
          streamingServices.delete(runId);
        };
        if (existingService.connectionState === ConnectionState.DISCONNECTED) {
          existingService.connect(runId, agent);
          agent.isSubscribed = true;
        } else {
          agent.isSubscribed = true;
        }
        return existingService;
      }

      const windowNodeContextStore = useWindowNodeContextStore();
      const wsEndpoint = windowNodeContextStore.getBoundEndpoints().agentWs;

      // Create streaming service for this agent
      const service = new AgentStreamingService(wsEndpoint);
      streamingServices.set(runId, service);

      agent.isSubscribed = true;
      agent.unsubscribe = () => {
        service.disconnect();
        streamingServices.delete(runId);
      };

      service.connect(runId, agent);
      return service;
    },

    async ensureAgentStreamConnected(runId: string): Promise<AgentStreamingService> {
      const service = this.connectToAgentStream(runId);
      if (!service) {
        throw new Error(`Unable to connect agent stream for run '${runId}'.`);
      }
      const isConnected = () => service.connectionState === ConnectionState.CONNECTED;
      if (isConnected()) {
        return service;
      }

      const timeoutAt = Date.now() + 10000;
      while (Date.now() < timeoutAt) {
        if (isConnected()) {
          return service;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      throw new Error(`Timed out waiting for agent stream connection for run '${runId}'.`);
    },

    disconnectAgentStream(runId: string): void {
      const service = streamingServices.get(runId);
      if (!service) {
        return;
      }

      const agentContextsStore = useAgentContextsStore();
      const agent = agentContextsStore.getRun(runId);

      service.disconnect();
      streamingServices.delete(runId);

      if (agent) {
        agent.isSubscribed = false;
        agent.unsubscribe = undefined;
      }
    },

    /**
     * @action postToolExecutionApproval
     * @description Sends the user's approval or denial for a tool call via WebSocket.
     */
    async postToolExecutionApproval(runId: string, invocationId: string, isApproved: boolean, _reason: string | null = null) {
      const service = streamingServices.get(runId);
      const agentContextsStore = useAgentContextsStore();
      const agent = agentContextsStore.getRun(runId);

      if (service) {
        if (isApproved) {
          service.approveTool(invocationId, _reason || undefined);
        } else {
          service.denyTool(invocationId, _reason || undefined);
        }
      }

      if (!agent) {
        return;
      }
    },

    stopGeneration(runId?: string): boolean {
      const agentContextsStore = useAgentContextsStore();
      const resolvedRunId =
        (runId && runId.trim()) || agentContextsStore.activeRun?.state.runId;

      if (!resolvedRunId) {
        console.warn("Cannot stop generation: no active run ID.");
        return false;
      }

      const service = streamingServices.get(resolvedRunId);
      if (!service) {
        console.warn(`Cannot stop generation: no streaming service for run '${resolvedRunId}'.`);
        return false;
      }

      service.stopGeneration();

      const context = agentContextsStore.getRun(resolvedRunId);
      if (context) {
        context.isSending = false;
      }
      return true;
    },

    /**
     * @action terminateRun
     * @description Terminates a run while preserving its row in history view.
     * This action owns runtime lifecycle teardown + backend termination orchestration.
     */
    async terminateRun(runId: string): Promise<boolean> {
      const agentContextsStore = useAgentContextsStore();
      const runHistoryStore = useRunHistoryStore();
      const context = agentContextsStore.getRun(runId);

      const teardownLocalRuntime = () => {
        if (context?.isSubscribed || streamingServices.has(runId)) {
          this.disconnectAgentStream(runId);
        }

        if (context) {
          context.isSending = false;
          context.state.currentStatus = AgentStatus.ShutdownComplete;
        }
      };

      if (runId.startsWith('temp-')) {
        teardownLocalRuntime();
        runHistoryStore.markRunAsInactive(runId);
        return true;
      }

      try {
        const client = getApolloClient();
        const { data, errors } = await client.mutate({
          mutation: TerminateAgentRun,
          variables: { agentRunId: runId },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const result = (data as any)?.terminateAgentRun;
        if (!result?.success) {
          throw new Error(result?.message || `Failed to terminate run '${runId}'.`);
        }

        teardownLocalRuntime();
        runHistoryStore.markRunAsInactive(runId);
        runHistoryStore.refreshTreeQuietly();
        return true;
      } catch (error) {
        console.error(`Error terminating run '${runId}':`, error);
        return false;
      }
    },

    /**
     * @action closeAgent
     * @description Closes an agent run in the workspace, disconnects WebSocket, and optionally terminates the backend run.
     */
    async closeAgent(runIdToClose: string, options: { terminate: boolean }) {
      const agentContextsStore = useAgentContextsStore();
      const agentToClose = agentContextsStore.getRun(runIdToClose);

      if (!agentToClose) return;

      if (options.terminate) {
        const terminated = await this.terminateRun(runIdToClose);
        if (!terminated) {
          return;
        }
      } else {
        this.disconnectAgentStream(runIdToClose);
      }

      agentContextsStore.removeRun(runIdToClose);
    },

  },
});
