import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient'
import {
  CreateAgentTeamRun,
  RestoreAgentTeamRun,
  TerminateAgentTeamRun,
} from '~/graphql/mutations/agentTeamRunMutations';
import type {
  TeamMemberConfigInput,
} from '~/generated/graphql';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import {
  ConnectionState,
  TeamStreamingService,
  type InterruptGenerationCommandAckPayload,
  type InterruptCommandTransportFailure,
} from '~/services/agentStreaming';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type { ContextAttachment } from '~/types/conversation';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ToolApprovalTarget } from '~/types/segments';
import { planContextAttachmentSubmission } from '~/utils/contextFiles/contextAttachmentSend';
import {
  buildTeamMemberDraftContextFileOwner,
  buildTeamMemberFinalContextFileOwner,
} from '~/utils/contextFiles/contextFileOwner';
import { loadRuntimeProviderGroupsForSelection } from '~/composables/useRuntimeScopedModelSelection';
import { flattenLeafAgentMemberNodes } from '~/utils/teamDefinitionMembers';
import { buildTeamRunMemberConfigRecords } from '~/utils/teamRunMemberConfigBuilder';
import { evaluateTeamRunLaunchReadiness } from '~/utils/teamRunLaunchReadiness';
import { resolveEffectiveMemberRuntimeKind } from '~/utils/teamRunConfigUtils';
import {
  applyOfflineOrTerminalCleanup,
} from '~/services/runStatus/agentRuntimeStatusState';
import {
  beginLocalUserSubmission,
  failLocalSubmission,
  finalizeLocalSubmissionAttachments,
  type LocalUserSubmissionHandle,
} from '~/services/runSubmission/localUserSubmission';
import {
  reconcileTeamContextAgentRunIdsFromBackend,
} from '~/services/runHydration/teamRunMemberIdentityReconciler';
import {
  beginRecentEventMonitorMutation,
  commitRecentEventMonitorMutation,
} from '~/services/eventMonitor/recentEventMonitorMutationCommit';
import { useToasts } from '~/composables/useToasts';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import {
  createTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';
import { findTeamExecutionNode } from '~/services/agentStreaming/teamTaskExecutionTree';

type CurrentTeamMemberConfigInput = Omit<TeamMemberConfigInput, 'memberName' | 'memberAddress'> & {
  memberAddress: string;
};

const teamStreamingServices = new Map<string, TeamStreamingService>();

const buildClientMessageId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) {
    return `client_${randomId}`;
  }
  return `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const buildClientInterruptCommandId = (): string =>
  buildClientMessageId().replace(/^client_/, 'client_interrupt_');

const showInterruptCommandResult = (ack: InterruptGenerationCommandAckPayload): void => {
  if (ack.state === 'accepted') return;
  useToasts().addToast(localizationRuntime.translate('agents.store.interrupt.failed', {
    target: ack.target.target_kind === 'team_member'
      ? ack.target.execution_address?.memberAddress ?? ack.target.team_run_id
      : ack.target.run_id,
    detail: ack.message,
  }), 'error');
};

const showInterruptTransportFailure = (failure: InterruptCommandTransportFailure): void => {
  useToasts().addToast(localizationRuntime.translate('agents.store.interrupt.transportFailed', {
    target: failure.target.target_kind === 'team_member'
      ? failure.target.execution_address?.memberAddress ?? failure.target.team_run_id
      : failure.target.run_id,
    detail: failure.reason.message,
  }), 'error');
};

const buildConversationTargetInputDedupeKey = (
  teamRunId: string,
  conversationTargetKey: string,
  messageId: string,
): string => `member_input:${teamRunId}:${conversationTargetKey}:${messageId}`;

interface CreateAgentTeamRunMutationPayload {
  createAgentTeamRun?: {
    success?: boolean;
    message?: string;
    teamRunId?: string | null;
  } | null;
}

interface RestoreAgentTeamRunMutationPayload {
  restoreAgentTeamRun?: {
    success?: boolean;
    message?: string;
    teamRunId?: string | null;
  } | null;
}

interface TerminateAgentTeamRunMutationPayload {
  terminateAgentTeamRun?: {
    success?: boolean;
    message?: string;
  } | null;
}

export interface FocusedTeamMemberInterruptTarget {
  teamRunId: string;
  executionAddress: TeamExecutionAddress;
}

export const useAgentTeamRunStore = defineStore('agentTeamRun', {
  state: () => ({
    isLaunching: false,
    stopPendingTeamIds: {} as Record<string, boolean>,
  }),

  actions: {
    connectToTeamStream(teamRunId: string): TeamStreamingService | null {
      const teamContextsStore = useAgentTeamContextsStore();
      const teamContext = teamContextsStore.getTeamContextById(teamRunId);

      if (!teamContext) {
        console.warn(`Could not find team context for ID ${teamRunId} to connect stream.`);
        return null;
      }

      const existingService = teamStreamingServices.get(teamRunId);
      if (existingService) {
        existingService.attachContext(teamContext);
        teamContext.unsubscribe = () => {
          existingService.disconnect();
          teamStreamingServices.delete(teamRunId);
        };
        if (existingService.connectionState === ConnectionState.DISCONNECTED) {
          existingService.connect(teamRunId, teamContext);
        }
        teamContext.isSubscribed = existingService.connectionState === ConnectionState.CONNECTED;
        return existingService;
      }

      const windowNodeContextStore = useWindowNodeContextStore();
      const wsEndpoint = windowNodeContextStore.getBoundEndpoints().teamWs;

      const service = new TeamStreamingService(wsEndpoint, {
        onInterruptCommandResult: showInterruptCommandResult,
        onInterruptCommandTransportFailure: showInterruptTransportFailure,
      });
      teamStreamingServices.set(teamRunId, service);

      teamContext.unsubscribe = () => {
        service.disconnect();
        teamStreamingServices.delete(teamRunId);
      };

      service.connect(teamRunId, teamContext);
      teamContext.isSubscribed = service.connectionState === ConnectionState.CONNECTED;
      return service;
    },

    async ensureTeamStreamConnected(teamRunId: string): Promise<TeamStreamingService> {
      const service = this.connectToTeamStream(teamRunId);
      if (!service) {
        throw new Error(`Unable to connect team stream for run '${teamRunId}'.`);
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

      throw new Error(`Timed out waiting for team stream connection for run '${teamRunId}'.`);
    },

    disconnectTeamStream(teamRunId: string): void {
      const service = teamStreamingServices.get(teamRunId);
      if (!service) {
        return;
      }

      const teamContextsStore = useAgentTeamContextsStore();
      const teamContext = teamContextsStore.getTeamContextById(teamRunId);

      service.disconnect();
      teamStreamingServices.delete(teamRunId);

      if (teamContext) {
        teamContext.isSubscribed = false;
        teamContext.unsubscribe = undefined;
      }
    },

    async terminateTeamRun(teamRunId: string): Promise<boolean> {
      const teamContextsStore = useAgentTeamContextsStore();
      const runHistoryStore = useRunHistoryStore();
      const teamContext = teamContextsStore.getTeamContextById(teamRunId);
      if (
        teamRunId.startsWith('temp-') ||
        this.stopPendingTeamIds[teamRunId] ||
        (teamContext && !teamContext.isActive)
      ) {
        return false;
      }
      this.stopPendingTeamIds = {
        ...this.stopPendingTeamIds,
        [teamRunId]: true,
      };

      const teardownLocalRuntime = () => {
        if (teamContext?.isSubscribed || teamStreamingServices.has(teamRunId)) {
          this.disconnectTeamStream(teamRunId);
        }

        if (teamContext) {
          teamContext.isSubscribed = false;
          teamContext.isActive = false;
          teamContext.agentExecutionsByKey.forEach((member) => {
            applyOfflineOrTerminalCleanup(member);
            useAgentActivityStore().clearActivities(member.state.runId);
          });
        }
      };

      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate<TerminateAgentTeamRunMutationPayload>({
          mutation: TerminateAgentTeamRun,
          variables: { teamRunId },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        const result = data?.terminateAgentTeamRun;
        if (!result?.success) {
          throw new Error(result?.message || `Failed to terminate team run '${teamRunId}'.`);
        }

        teardownLocalRuntime();
        runHistoryStore.markTeamAsInactive(teamRunId);
        void runHistoryStore.refreshTreeQuietly();
        return true;
      } catch (error) {
        console.error(`Error terminating team ${teamRunId} on backend:`, error);
        return false;
      } finally {
        const next = { ...this.stopPendingTeamIds };
        delete next[teamRunId];
        this.stopPendingTeamIds = next;
      }
    },

    async terminateActiveTeam() {
      const activeTeam = useAgentTeamContextsStore().activeTeamContext;
      if (activeTeam) {
        await this.terminateTeamRun(activeTeam.teamRunId);
      }
    },

    discardDraftTeamRun(teamRunId: string): boolean {
      const normalizedTeamRunId = teamRunId.trim();
      if (!normalizedTeamRunId || !normalizedTeamRunId.startsWith('temp-')) {
        return false;
      }

      const teamContextsStore = useAgentTeamContextsStore();
      const teamContext = teamContextsStore.getTeamContextById(normalizedTeamRunId);
      if (!teamContext) {
        return false;
      }

      if (teamContext.isSubscribed || teamStreamingServices.has(normalizedTeamRunId)) {
        this.disconnectTeamStream(normalizedTeamRunId);
      }

      teamContext.isSubscribed = false;
      teamContext.isActive = false;
      teamContext.agentExecutionsByKey.forEach((member) => {
        applyOfflineOrTerminalCleanup(member);
        useAgentActivityStore().clearActivities(member.state.runId);
      });

      teamContextsStore.removeTeamContext(normalizedTeamRunId);
      return true;
    },

    async sendMessageToFocusedMember(text: string, contextAttachments: ContextAttachment[]) {
      const teamContextsStore = useAgentTeamContextsStore();
      const runHistoryStore = useRunHistoryStore();
      const contextFileUploadStore = useContextFileUploadStore();
      const activeTeam = teamContextsStore.activeTeamContext;
      if (!activeTeam) {
        throw new Error('No active team context.');
      }

      const initialExecutionAddress = createTeamExecutionAddress(activeTeam.focusedExecutionAddress);
      const initialExecutionKey = serializeTeamExecutionAddress(initialExecutionAddress);
      const focusedMember = activeTeam.agentExecutionsByKey.get(initialExecutionKey) ?? null;
      const focusedNode = findTeamExecutionNode(activeTeam, initialExecutionAddress);
      if (!focusedNode) throw new Error(`Focused Team execution '${initialExecutionAddress.memberAddress}' is not present.`);
      const isTemporary = activeTeam.teamRunId.startsWith('temp-');
      let finalTeamRunId = activeTeam.teamRunId;
      let targetExecutionAddress = initialExecutionAddress;
      let conversationTargetKey = initialExecutionKey;
      const targetUploadKey = initialExecutionAddress.memberAddress;
      const teamResumeConfig = !isTemporary
        ? runHistoryStore.teamResumeConfigByTeamRunId[finalTeamRunId] || null
        : null;
      const draftOwner = buildTeamMemberDraftContextFileOwner(activeTeam.teamRunId, targetUploadKey);
      let localSubmission: LocalUserSubmissionHandle | null = null;

      try {
        let memberConfigs: CurrentTeamMemberConfigInput[] | null = null;
        if (isTemporary) {
          this.isLaunching = true;

          const leafMembers = flattenLeafAgentMemberNodes(activeTeam.rootTeam.children);

          const runtimeKinds = new Set<string>();
          runtimeKinds.add(activeTeam.config.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND);
          Object.values(activeTeam.config.memberOverrides || {}).forEach((override) => {
            runtimeKinds.add(resolveEffectiveMemberRuntimeKind(override, activeTeam.config.runtimeKind));
          });

          const runtimeModelCatalogs: Record<string, string[]> = {};
          await Promise.all(
            Array.from(runtimeKinds).map(async (runtimeKind) => {
              const rows = await loadRuntimeProviderGroupsForSelection(runtimeKind);
              runtimeModelCatalogs[runtimeKind] = rows.flatMap((row) =>
                row.models.map((model) => model.modelIdentifier),
              );
            }),
          );

          const readiness = evaluateTeamRunLaunchReadiness(activeTeam.config, runtimeModelCatalogs);
          if (!readiness.canLaunch) {
            throw new Error(readiness.blockingIssues[0]?.message || 'Team configuration is not launch-ready.');
          }

          memberConfigs = buildTeamRunMemberConfigRecords({
            config: activeTeam.config,
            leafMembers,
          }).map(({ workspaceMetadata: _workspaceMetadata, displayName: _displayName, ...memberConfig }) => ({
            ...memberConfig,
            skillAccessMode: memberConfig.skillAccessMode as TeamMemberConfigInput['skillAccessMode'],
          }));
        }

        if (focusedMember) {
          localSubmission = beginLocalUserSubmission(focusedMember, {
            text,
            attachments: contextAttachments,
          });
        }

        if (isTemporary) {
          const client = getApolloClient()
          const { data, errors } = await client.mutate<CreateAgentTeamRunMutationPayload>({
            mutation: CreateAgentTeamRun,
            variables: {
              input: {
                teamDefinitionId: activeTeam.config.teamDefinitionId,
                memberConfigs: memberConfigs ?? [],
              }
            }
          });

          if (errors && errors.length > 0) {
            throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
          }

          const result = data?.createAgentTeamRun;
          if (!result) {
            throw new Error('Failed to create team run: No response returned.');
          }

          if (!result.success) {
            throw new Error(result.message || 'Failed to create team run.');
          }

          const permanentTeamRunId = result.teamRunId;
          if (!permanentTeamRunId) {
            throw new Error('Failed to create team run: No teamRunId returned on success.');
          }

          finalTeamRunId = permanentTeamRunId;
          teamContextsStore.promoteTemporaryTeamRunId(activeTeam.teamRunId, permanentTeamRunId);
          targetExecutionAddress = createTeamExecutionAddress({
            ...initialExecutionAddress,
            rootTeamRunId: permanentTeamRunId,
          });
          conversationTargetKey = serializeTeamExecutionAddress(targetExecutionAddress);
          const promotedTeamContext = teamContextsStore.getTeamContextById(permanentTeamRunId);
          if (!promotedTeamContext) {
            throw new Error(`Team context '${permanentTeamRunId}' not found after creation.`);
          }
          await reconcileTeamContextAgentRunIdsFromBackend({
            teamContext: promotedTeamContext,
            teamRunId: permanentTeamRunId,
          });
        } else if (teamResumeConfig && !teamResumeConfig.isActive) {
          const client = getApolloClient();
          const { data, errors } = await client.mutate<RestoreAgentTeamRunMutationPayload>({
            mutation: RestoreAgentTeamRun,
            variables: { teamRunId: finalTeamRunId },
          });

          if (errors && errors.length > 0) {
            throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
          }

          const result = data?.restoreAgentTeamRun;
          if (!result) {
            throw new Error('Failed to restore team run: No response returned.');
          }
          if (!result.success) {
            throw new Error(result.message || 'Failed to restore team run.');
          }

          finalTeamRunId = result.teamRunId || finalTeamRunId;
        }

        teamContextsStore.lockConfig(finalTeamRunId);
        runHistoryStore.markTeamAsActive(finalTeamRunId);
        void runHistoryStore.refreshTreeQuietly();

        const finalTeamContext = teamContextsStore.getTeamContextById(finalTeamRunId);
        if (!finalTeamContext) {
          throw new Error(`Team context '${finalTeamRunId}' not found after creation.`);
        }
        finalTeamContext.isActive = true;
        const finalizedAttachments = await contextFileUploadStore.finalizeDraftAttachments({
          draftOwner,
          finalOwner: buildTeamMemberFinalContextFileOwner(finalTeamRunId, targetUploadKey),
          attachments: contextAttachments,
        });

        const finalFocusedMember = finalTeamContext.agentExecutionsByKey.get(conversationTargetKey) || null;
        if (focusedNode.kind === 'agent' && !finalFocusedMember) {
          throw new Error(`Focused member '${conversationTargetKey}' not found after team creation.`);
        }

        const messageId = buildClientMessageId();
        const dedupeKey = buildConversationTargetInputDedupeKey(finalTeamRunId, conversationTargetKey, messageId);
        const submissionPlan = planContextAttachmentSubmission(finalizedAttachments);
        if (localSubmission) {
          localSubmission.message.messageId = messageId;
          localSubmission.message.dedupeKey = dedupeKey;
          finalizeLocalSubmissionAttachments(localSubmission, submissionPlan.retainedMessageAttachments);
        } else if (finalFocusedMember) {
          const presentationBaseline = beginRecentEventMonitorMutation(finalFocusedMember);
          finalFocusedMember.state.conversation.messages.push({
            type: 'user',
            text,
            timestamp: new Date(),
            contextFilePaths: submissionPlan.retainedMessageAttachments,
            messageId,
            dedupeKey,
          });
          commitRecentEventMonitorMutation(finalFocusedMember, presentationBaseline);
          finalFocusedMember.state.conversation.updatedAt = new Date().toISOString();
        }

        const service = await this.ensureTeamStreamConnected(finalTeamRunId);
        service.sendMessage(
          text,
          targetExecutionAddress,
          submissionPlan.executable.contextFilePaths,
          submissionPlan.executable.imageUrls,
          { messageId, dedupeKey },
        );
      } catch (error: any) {
        console.error(`Failed to send message to conversation target ${conversationTargetKey}:`, error);
        if (localSubmission) {
          failLocalSubmission(localSubmission, error);
          applyOfflineOrTerminalCleanup(localSubmission.context, AgentStatus.Error);
          return;
        }
        if (focusedMember) {
          focusedMember.submissionPending = false;
        }
        throw new Error(`Failed to send message: ${error.message}`);
      } finally {
        if (isTemporary) {
          this.isLaunching = false;
        }
      }
    },

    /**
     * Sends tool approval/denial to the active team stream.
     */
    async postToolExecutionApproval(
      invocationId: string,
      isApproved: boolean,
      reason: string | null = null,
      approvalTarget: ToolApprovalTarget | null = null,
    ) {
      const teamContextsStore = useAgentTeamContextsStore();
      const activeTeam = teamContextsStore.activeTeamContext;

      if (!activeTeam) {
        console.warn('No active team for tool approval.');
        return;
      }

      const service = teamStreamingServices.get(activeTeam.teamRunId);

      if (service) {
        if (isApproved) {
          service.approveTool(invocationId, approvalTarget, reason || undefined);
        } else {
          service.denyTool(invocationId, approvalTarget, reason || undefined);
        }
      }

    },

    interruptFocusedMemberGeneration(target: FocusedTeamMemberInterruptTarget): boolean {
      const teamRunId = target.teamRunId.trim();
      const executionAddress = createTeamExecutionAddress(target.executionAddress);

      if (!teamRunId) {
        console.warn('Cannot interrupt generation: team run ID is required.');
        return false;
      }
      if (executionAddress.rootTeamRunId !== teamRunId) {
        console.warn('Cannot interrupt generation: execution address does not belong to the Team run.');
        return false;
      }

      const service = teamStreamingServices.get(teamRunId);
      if (!service) {
        console.warn(`Cannot interrupt generation: no streaming service for team '${teamRunId}'.`);
        return false;
      }

      return service.interruptGeneration(buildClientInterruptCommandId(), {
        executionAddress,
      });
    },
  },
});
