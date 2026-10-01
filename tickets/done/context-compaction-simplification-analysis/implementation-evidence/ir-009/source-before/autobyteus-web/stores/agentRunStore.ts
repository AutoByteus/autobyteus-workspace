import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { defineStore } from 'pinia';
import { skillRequestInstruction } from '~/utils/skills/skillRequestInstruction';
import { mentionsPresentInText, toCollaboratorMentionDtos } from '~/utils/collaborators/collaboratorMentionText';
import { getApolloClient } from '~/utils/apolloClient'
import { CancelPreparedAgentRun, PrepareAgentRun, TerminateAgentRun } from '~/graphql/mutations/agentMutations';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import {
  AgentStreamingService,
  type InterruptGenerationCommandAckPayload,
  type InterruptCommandTransportFailure,
  type SendMessageCommandAckPayload,
} from '~/services/agentStreaming';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { resolveRunnableModelIdentifier } from '~/utils/runLaunchPolicy';
import { planContextAttachmentSubmission } from '~/utils/contextFiles/contextAttachmentSend';
import {
  buildAgentDraftContextFileOwner,
  buildAgentFinalContextFileOwner,
} from '~/utils/contextFiles/contextFileOwner';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { ConnectionState } from '~/services/agentStreaming';
import {
  applyOfflineOrTerminalCleanup,
} from '~/services/runStatus/agentRuntimeStatusState';
import { CollaboratorAddRejection } from '~/services/collaborators/collaboratorAddFailures';
import {
  acceptLocalSubmission,
  beginLocalUserSubmission,
  failLocalSubmission,
  finalizeLocalSubmissionAttachments,
  retargetLocalUserSubmission,
} from '~/services/runSubmission/localUserSubmission';
import { useToasts } from '~/composables/useToasts';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';

interface PrepareAgentRunMutationResultPayload {
  prepareAgentRun: {
    success: boolean;
    message: string;
    runId?: string | null;
    activationState?: string | null;
    preparedExpiresAt?: string | null;
  };
}

const createClientMessageId = (): string => {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `client_${randomId}`;
};

const createClientInterruptCommandId = (): string =>
  createClientMessageId().replace(/^client_/, 'client_interrupt_');

const showInterruptCommandResult = (ack: InterruptGenerationCommandAckPayload): void => {
  if (ack.state === 'accepted') return;
  useToasts().addToast(localizationRuntime.translate('agents.store.interrupt.failed', {
    target: ack.target.target_kind === 'standalone_run'
      ? ack.target.run_id
      : ack.target.agent_run_id,
    detail: ack.message,
  }), 'error');
};

const showInterruptTransportFailure = (failure: InterruptCommandTransportFailure): void => {
  useToasts().addToast(localizationRuntime.translate('agents.store.interrupt.transportFailed', {
    target: failure.target.target_kind === 'standalone_run'
      ? failure.target.run_id
      : failure.target.agent_run_id,
    detail: failure.reason.message,
  }), 'error');
};

// Maintain a map of streaming services per agent
const streamingServices = new Map<string, AgentStreamingService>();

/**
 * Runs this client sent to while it did not consider them live (a first send or a resume of an
 * Offline/Error run), until the server confirms activation. History reconcile must not tear such
 * a run down on a snapshot taken before activation (D-14). Live AGENT_STATUS events never clear
 * the marker: the server reports `offline` as soon as the stream connects, before SEND_MESSAGE.
 */
const activationPendingRunIds = new Set<string>();

const NOT_LIVE_STATUSES = new Set<string>([AgentStatus.Offline, AgentStatus.Error]);

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
      const isResumeOfStoppedRun = !isNewAgent && !state.recoverableBlock && NOT_LIVE_STATUSES.has(String(state.currentStatus));
      const resumeConfig = !isNewAgent ? runHistoryStore.getResumeConfig(runId) : null;
      const workspaceId = config.workspaceId;
      const workspaceRootPath = config.workspaceMetadata?.workspaceRootPath || (workspaceId
        ? (
            workspaceStore.workspaces[workspaceId]?.absolutePath
            || workspaceStore.workspaces[workspaceId]?.workspaceConfig?.root_path
            || workspaceStore.workspaces[workspaceId]?.workspaceConfig?.rootPath
            || null
          )
        : (resumeConfig?.metadataConfig.workspaceRootPath || null));

      if (isNewAgent && !config.llmModelIdentifier) {
        const llmProviderConfigStore = useLLMProviderConfigStore();
        const modelRuntimeKind = config.runtimeKind ?? DEFAULT_AGENT_RUNTIME_KIND;
        config.llmModelIdentifier = await resolveRunnableModelIdentifier({
          candidateModels: [config.llmModelIdentifier],
          getKnownModels: () => llmProviderConfigStore.models(modelRuntimeKind),
          ensureModelsLoaded: async () => {
            await llmProviderConfigStore.fetchProvidersWithModels(modelRuntimeKind);
            await llmProviderConfigStore.ensureMissingDynamicProviders(modelRuntimeKind);
          },
        });
      }

      if (isNewAgent && !config.llmModelIdentifier) {
        throw new Error("Please select a model for the first message.");
      }
      if (isNewAgent && !workspaceRootPath) {
        throw new Error("A workspace root path is required for the first message.");
      }
      if (isNewAgent && !config.runtimeKind) {
        throw new Error("A runtime kind is required for the first message.");
      }

      if (isNewAgent) {
        state.conversation.llmModelIdentifier = config.llmModelIdentifier;
      }
      const userText = currentAgent.requirement;
      const messageContent = skillRequestInstruction.compose(currentAgent.requestedSkillNames, userText);
      // The run summary reads from the user's own words; only a tags-only message uses the instruction.
      const initialSummary = userText.trim() ? userText : messageContent;
      const draftAttachments = [...currentAgent.contextFilePaths];
      const draftOwner = buildAgentDraftContextFileOwner(runId);
      const messageId = createClientMessageId();
      let dedupeKey = `agent_run_input:${runId}:${messageId}`;
      // `@` mentions exist only for an existing run; a first message never carries them.
      const mentions = isNewAgent ? [] : mentionsPresentInText(userText, currentAgent.requestedMentions);
      const localSubmission = beginLocalUserSubmission(currentAgent, {
        text: messageContent, identity: { messageId, dedupeKey },
        attachments: draftAttachments,
        navigationTarget: { kind: 'standalone', runId },
        mentions,
      });

      let preparedRunId: string | null = null;
      let activationPendingRunId: string | null = null;
      if (isResumeOfStoppedRun) {
        activationPendingRunId = runId;
        this.markActivationPending(runId);
      }
      try {
        let finalRunId = runId;
        if (isNewAgent) {
          const client = getApolloClient()
          const { data, errors } = await client.mutate<PrepareAgentRunMutationResultPayload>({
            mutation: PrepareAgentRun,
            variables: {
              input: {
                agentDefinitionId: state.conversation.agentDefinitionId,
                workspaceId: workspaceId ?? undefined,
                workspaceRootPath,
                llmModelIdentifier: config.llmModelIdentifier,
                autoExecuteTools: config.autoExecuteTools,
                llmConfig: config.llmConfig ?? null,
                runtimeKind: config.runtimeKind,
                initialSummary,
              }
            }
          });

          if (errors && errors.length > 0) {
            throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
          }

          const result = data?.prepareAgentRun;
          if (!result) {
            throw new Error('Failed to prepare agent run: No response returned.');
          }

          if (!result.success) {
            throw new Error(result.message || 'Failed to prepare agent run.');
          }

          const permanentRunId = result.runId;
          if (!permanentRunId) {
            throw new Error('Failed to prepare agent run: No runId returned on success.');
          }

          finalRunId = permanentRunId;
          dedupeKey = `agent_run_input:${permanentRunId}:${messageId}`;
          localSubmission.message.dedupeKey = dedupeKey;
          preparedRunId = permanentRunId;
          agentContextsStore.promoteTemporaryId(runId, permanentRunId);
          activationPendingRunId = permanentRunId;
          this.markActivationPending(permanentRunId);
          retargetLocalUserSubmission(localSubmission, {
            kind: 'standalone',
            runId: permanentRunId,
          });
        }

        agentContextsStore.lockConfig(finalRunId);

        const finalizedAttachments = await contextFileUploadStore.finalizeDraftAttachments({
          draftOwner,
          finalOwner: buildAgentFinalContextFileOwner(finalRunId),
          attachments: draftAttachments,
        });

        const finalAgent = agentContextsStore.getRun(finalRunId);
        if (!finalAgent) {
          throw new Error(`Agent run '${finalRunId}' not found after startup.`);
        }
        const submissionPlan = planContextAttachmentSubmission(finalizedAttachments);
        finalizeLocalSubmissionAttachments(localSubmission, submissionPlan.retainedMessageAttachments);

        const service = await this.ensureAgentStreamConnected(finalRunId);
        const command = {
          messageId,
          dedupeKey,
          mentions: toCollaboratorMentionDtos(userText, mentions),
        };
        if (localSubmission.held) {
          // A send with mentions is shown only once the run accepts it (AR-007).
          await service.sendMessageAwaitingAdmission(
            messageContent, submissionPlan.executable.contextFilePaths, submissionPlan.executable.imageUrls, command,
          );
          acceptLocalSubmission(localSubmission);
        } else {
          service.sendMessage(messageContent, submissionPlan.executable.contextFilePaths, submissionPlan.executable.imageUrls, command);
        }
        preparedRunId = null;
        runHistoryStore.refreshTreeQuietly();
      } catch (error: any) {
        console.error('Error sending user input:', error);
        if (activationPendingRunId) this.clearActivationPending(activationPendingRunId);
        if (preparedRunId) {
          getApolloClient().mutate({
            mutation: CancelPreparedAgentRun,
            variables: { agentRunId: preparedRunId },
          }).catch((cancelError: unknown) => {
            console.warn(`Failed to cancel prepared agent run '${preparedRunId}'.`, cancelError);
          });
        }
        // A rejected add posted nothing: the notice shows and the draft stays as typed.
        if (localSubmission.held && error instanceof CollaboratorAddRejection) {
          failLocalSubmission(localSubmission, error);
          return;
        }
        applyOfflineOrTerminalCleanup(localSubmission.context, AgentStatus.Error);
        failLocalSubmission(localSubmission, error);

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
        if (existingService.connectionState === ConnectionState.DISCONNECTED) {
          existingService.connect(runId, agent);
        }
        return existingService;
      }

      const windowNodeContextStore = useWindowNodeContextStore();
      const wsEndpoint = windowNodeContextStore.getBoundEndpoints().agentWs;

      // Create streaming service for this agent
      const service = new AgentStreamingService(wsEndpoint, {
        onInterruptCommandResult: showInterruptCommandResult,
        onInterruptCommandTransportFailure: showInterruptTransportFailure,
        onSendMessageCommandAck: (ack: SendMessageCommandAckPayload) => {
          // A rejected send never activates the run.
          if (!ack.accepted) this.clearActivationPending(ack.run_id || runId);
        },
      });
      streamingServices.set(runId, service);

      service.connect(runId, agent);
      return service;
    },

    markActivationPending(runId: string): void {
      activationPendingRunIds.add(runId);
    },

    clearActivationPending(runId: string): void {
      activationPendingRunIds.delete(runId);
    },

    isActivationPending(runId: string): boolean {
      return activationPendingRunIds.has(runId);
    },

    isAgentStreamReady(runId: string): boolean {
      return streamingServices.get(runId)?.connectionState === ConnectionState.CONNECTED;
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

    interruptGeneration(runId?: string): boolean {
      const agentContextsStore = useAgentContextsStore();
      const resolvedRunId =
        (runId && runId.trim()) || agentContextsStore.activeRun?.state.runId;

      if (!resolvedRunId) {
        console.warn("Cannot interrupt generation: no active run ID.");
        return false;
      }

      const service = streamingServices.get(resolvedRunId);
      if (!service) {
        console.warn(`Cannot interrupt generation: no streaming service for run '${resolvedRunId}'.`);
        return false;
      }

      return service.interruptGeneration(createClientInterruptCommandId());
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
      const state = context?.state;
      const instance = state?.inputProjection?.runInstanceId;
      const service = streamingServices.get(runId);
      const binding = useWindowNodeContextStore().bindingRevision;
      const activities = useAgentActivityStore();
      const activityIds = activities.getNativeCompactionActivityIds(runId);
      const ownsRequest = () => agentContextsStore.getRun(runId) === context
        && context?.state === state && (!state || state.runId === runId) && streamingServices.get(runId) === service
        && useWindowNodeContextStore().bindingRevision === binding
        && (!state?.inputProjection?.runInstanceId || state.inputProjection.runInstanceId === instance);

      const teardownLocalRuntime = () => {
        this.clearActivationPending(runId);
        if (streamingServices.has(runId)) {
          this.disconnectAgentStream(runId);
        }

        if (context) {
          applyOfflineOrTerminalCleanup(context);
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

        if (!ownsRequest()) return false;
        if (context?.config.runtimeKind === 'autobyteus' && state) {
          state.compactionStatus = activities.applyConfirmedNativeTermination(runId,
            [...activityIds, ...activities.getNativeCompactionActivityIds(runId)], state.compactionStatus);
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
      this.clearActivationPending(runIdToClose);

      agentContextsStore.removeRun(runIdToClose);
    },

  },
});
