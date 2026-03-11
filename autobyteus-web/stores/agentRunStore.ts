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
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { resolveRunnableModelIdentifier } from '~/utils/runLaunchPolicy';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { ConnectionState } from '~/services/agentStreaming';

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
      const runHistoryStore = useRunHistoryStore();
      const workspaceStore = useWorkspaceStore();
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
        : (resumeConfig?.manifestConfig.workspaceRootPath || null);

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
              runId: isNewAgent ? null : runId,
              agentDefinitionId: isNewAgent ? state.conversation.agentDefinitionId : undefined,
              workspaceId: isNewAgent ? workspaceId : undefined,
              workspaceRootPath: workspaceRootPath || undefined,
              llmModelIdentifier: config.llmModelIdentifier,
              autoExecuteTools: config.autoExecuteTools,
              llmConfig: config.llmConfig ?? null,
              skillAccessMode: config.skillAccessMode,
              runtimeKind: config.runtimeKind ?? DEFAULT_AGENT_RUNTIME_KIND,
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

        const permanentRunId = result.runId;
        if (!permanentRunId) {
          throw new Error('Failed to continue run: No runId returned on success.');
        }

        let finalRunId = runId;
        if (isNewAgent) {
          finalRunId = permanentRunId;
          agentContextsStore.promoteTemporaryId(runId, permanentRunId);
        }

        agentContextsStore.lockConfig(finalRunId);
        runHistoryStore.markRunAsActive(finalRunId);
        runHistoryStore.refreshTreeQuietly();

        const finalAgent = agentContextsStore.getRun(finalRunId)!;
        finalAgent.requirement = '';
        finalAgent.contextFilePaths = [];

        if (!finalAgent.isSubscribed) {
          this.connectToAgentStream(finalRunId);
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
     * @description Establishes a WebSocket connection to receive real-time events for a specific run.
     */
    connectToAgentStream(runId: string) {
      const agentContextsStore = useAgentContextsStore();
      const agent = agentContextsStore.getRun(runId);

      if (!agent) return;

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
        return;
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
          variables: { id: runId },
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
