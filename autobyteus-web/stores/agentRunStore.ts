import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient'
import { TerminateAgentRun } from '~/graphql/mutations/agentMutations';
import { ContinueRun } from '~/graphql/mutations/runHistoryMutations';
import type {
  ContextFileType,
} from '~/generated/graphql';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { AgentStreamingService } from '~/services/agentStreaming';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useRunTreeStore } from '~/stores/runTreeStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { resolveRunnableModelIdentifier } from '~/utils/runLaunchPolicy';
import { AgentStatus } from '~/types/agent/AgentStatus';

interface ContinueRunMutationResultPayload {
  continueRun: {
    success: boolean;
    message: string;
    runId?: string | null;
    ignoredConfigFields: string[];
  };
}

// Maintain a map of streaming services per agent
const streamingServices = new Map<string, AgentStreamingService>();

/**
 * @store agentRun
 * @description This store is the "service" or "orchestration" layer for agent interactions.
 * It uses WebSocket streaming for real-time updates and GraphQL mutations for commands.
 */
export const useAgentRunStore = defineStore('agentRun', {
  state: () => ({}),
  getters: {},

  actions: {
    /**
     * @action sendUserInputAndSubscribe
     * @description Sends the user's input to the backend to start or continue an agent run,
     * then ensures a WebSocket connection is active to receive live updates.
     */
    async sendUserInputAndSubscribe(): Promise<void> {
      const agentContextsStore = useAgentContextsStore();
      const runHistoryStore = useRunTreeStore();
      const workspaceStore = useWorkspaceStore();
      const currentAgent = agentContextsStore.activeRun;

      if (!currentAgent) {
        throw new Error('No active agent selected.');
      }

      const { config, state } = currentAgent;
      const agentId = state.agentId;
      const isNewAgent = agentId.startsWith('temp-');
      const resumeConfig = !isNewAgent ? runHistoryStore.getResumeConfig(agentId) : null;
      const workspaceId = config.workspaceId;
      const workspaceRootPath = workspaceId
        ? (
            workspaceStore.workspaces[workspaceId]?.absolutePath
            || workspaceStore.workspaces[workspaceId]?.workspaceConfig?.root_path
            || workspaceStore.workspaces[workspaceId]?.workspaceConfig?.rootPath
            || null
          )
        : (resumeConfig?.manifestConfig.workspaceRootPath || null);

      if (isNewAgent && !config.llmModelIdentifier) {
        const llmProviderConfigStore = useLLMProviderConfigStore();
        config.llmModelIdentifier = await resolveRunnableModelIdentifier({
          candidateModels: [config.llmModelIdentifier],
          getKnownModels: () => llmProviderConfigStore.models,
          ensureModelsLoaded: async () => {
            if (llmProviderConfigStore.models.length === 0) {
              await llmProviderConfigStore.fetchProvidersWithModels();
            }
          },
        });
      }

      if (isNewAgent && !config.llmModelIdentifier) {
        throw new Error("Please select a model for the first message.");
      }

      if (isNewAgent) {
        state.conversation.llmModelIdentifier = config.llmModelIdentifier;

      }

      // Add the user message to the conversation
      currentAgent.state.conversation.messages.push({
        type: 'user',
        text: currentAgent.requirement,
        timestamp: new Date(),
        contextFilePaths: currentAgent.contextFilePaths
      });
      currentAgent.state.conversation.updatedAt = new Date().toISOString();

      currentAgent.isSending = true;

      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate<ContinueRunMutationResultPayload>({
          mutation: ContinueRun,
          variables: {
            input: {
              userInput: {
                content: currentAgent.requirement,
                contextFiles: currentAgent.contextFilePaths.map(cf => ({ path: cf.path, type: cf.type.toUpperCase() as ContextFileType })),
              },
              runId: isNewAgent ? null : agentId,
              agentDefinitionId: isNewAgent ? state.conversation.agentDefinitionId : undefined,
              workspaceId: isNewAgent ? workspaceId : undefined,
              workspaceRootPath: workspaceRootPath || undefined,
              llmModelIdentifier: config.llmModelIdentifier,
              autoExecuteTools: config.autoExecuteTools,
              llmConfig: config.llmConfig ?? null,
              skillAccessMode: config.skillAccessMode,
            }
          }
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const result = data?.continueRun;
        if (!result) {
          throw new Error('Failed to continue run: No response returned.');
        }

        if (!result.success) {
          throw new Error(result.message || 'Failed to continue run.');
        }

        const permanentAgentId = result.runId;
        if (!permanentAgentId) {
          throw new Error('Failed to continue run: No runId returned on success.');
        }

        let finalAgentId = agentId;
        if (isNewAgent) {
          finalAgentId = permanentAgentId;
          agentContextsStore.promoteTemporaryId(agentId, permanentAgentId);
        }

        agentContextsStore.lockConfig(finalAgentId);
        runHistoryStore.markRunAsActive(finalAgentId);
        runHistoryStore.refreshTreeQuietly();

        const finalAgent = agentContextsStore.getRun(finalAgentId)!;
        finalAgent.requirement = '';
        finalAgent.contextFilePaths = [];

        if (!finalAgent.isSubscribed) {
          this.connectToAgentStream(finalAgentId);
        }
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
     * @description Establishes a WebSocket connection to receive real-time events for a specific agent.
     */
    connectToAgentStream(agentId: string) {
      if (streamingServices.has(agentId)) {
        return;
      }

      const agentContextsStore = useAgentContextsStore();
      const agent = agentContextsStore.getRun(agentId);

      if (!agent) return;

      const windowNodeContextStore = useWindowNodeContextStore();
      const wsEndpoint = windowNodeContextStore.getBoundEndpoints().agentWs;

      // Create streaming service for this agent
      const service = new AgentStreamingService(wsEndpoint);
      streamingServices.set(agentId, service);

      agent.isSubscribed = true;
      agent.unsubscribe = () => {
        service.disconnect();
        streamingServices.delete(agentId);
      };

      service.connect(agentId, agent);
    },

    /**
     * @action postToolExecutionApproval
     * @description Sends the user's approval or denial for a tool call via WebSocket.
     */
    async postToolExecutionApproval(agentId: string, invocationId: string, isApproved: boolean, _reason: string | null = null) {
      const service = streamingServices.get(agentId);
      const agentContextsStore = useAgentContextsStore();
      const agent = agentContextsStore.getRun(agentId);

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

    /**
     * @action terminateRun
     * @description Terminates a run while preserving its row in history view.
     * This action owns runtime lifecycle teardown + backend termination orchestration.
     */
    async terminateRun(agentId: string): Promise<boolean> {
      const agentContextsStore = useAgentContextsStore();
      const runHistoryStore = useRunTreeStore();
      const context = agentContextsStore.getRun(agentId);

      const teardownLocalRuntime = () => {
        if (context?.unsubscribe) {
          context.unsubscribe();
          context.isSubscribed = false;
          context.unsubscribe = undefined;
        }
        streamingServices.delete(agentId);

        if (context) {
          context.isSending = false;
          context.state.currentStatus = AgentStatus.ShutdownComplete;
        }
      };

      if (agentId.startsWith('temp-')) {
        teardownLocalRuntime();
        runHistoryStore.markRunAsInactive(agentId);
        return true;
      }

      try {
        const client = getApolloClient();
        const { data, errors } = await client.mutate({
          mutation: TerminateAgentRun,
          variables: { id: agentId },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const result = (data as any)?.terminateAgentRun;
        if (!result?.success) {
          throw new Error(result?.message || `Failed to terminate run '${agentId}'.`);
        }

        teardownLocalRuntime();
        runHistoryStore.markRunAsInactive(agentId);
        runHistoryStore.refreshTreeQuietly();
        return true;
      } catch (error) {
        console.error(`Error terminating run '${agentId}':`, error);
        return false;
      }
    },

    /**
     * @action closeAgent
     * @description Closes an agent run in the workspace, disconnects WebSocket, and optionally terminates the backend run.
     */
    async closeAgent(agentIdToClose: string, options: { terminate: boolean }) {
      const agentContextsStore = useAgentContextsStore();
      const agentToClose = agentContextsStore.getRun(agentIdToClose);

      if (!agentToClose) return;

      if (options.terminate) {
        const terminated = await this.terminateRun(agentIdToClose);
        if (!terminated) {
          return;
        }
      } else {
        if (agentToClose.unsubscribe) {
          agentToClose.unsubscribe();
          agentToClose.isSubscribed = false;
          agentToClose.unsubscribe = undefined;
        }
        streamingServices.delete(agentIdToClose);
      }

      agentContextsStore.removeRun(agentIdToClose);
    },

  },
});
