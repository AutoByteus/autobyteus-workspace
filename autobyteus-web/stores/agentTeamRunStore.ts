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
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { ConnectionState, TeamStreamingService } from '~/services/agentStreaming';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type { ContextAttachment } from '~/types/conversation';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { partitionContextAttachmentsForStreaming } from '~/utils/contextFiles/contextAttachmentSend';
import {
  buildTeamMemberDraftContextFileOwner,
  buildTeamMemberFinalContextFileOwner,
} from '~/utils/contextFiles/contextFileOwner';
import { loadRuntimeProviderGroupsForSelection } from '~/composables/useRuntimeScopedModelSelection';
import { resolveLeafTeamMembers } from '~/utils/teamDefinitionMembers';
import { buildTeamRunMemberConfigRecords } from '~/utils/teamRunMemberConfigBuilder';
import { evaluateTeamRunLaunchReadiness } from '~/utils/teamRunLaunchReadiness';
import { resolveEffectiveMemberRuntimeKind } from '~/utils/teamRunConfigUtils';

// Maintain a map of streaming services per team run
const teamStreamingServices = new Map<string, TeamStreamingService>();

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

export const useAgentTeamRunStore = defineStore('agentTeamRun', {
  state: () => ({
    isLaunching: false,
  }),

  actions: {
    /**
     * Establish WebSocket connection for a team run.
     */
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
          teamContext.isSubscribed = true;
        } else {
          teamContext.isSubscribed = true;
        }
        return existingService;
      }

      const windowNodeContextStore = useWindowNodeContextStore();
      const wsEndpoint = windowNodeContextStore.getBoundEndpoints().teamWs;

      const service = new TeamStreamingService(wsEndpoint);
      teamStreamingServices.set(teamRunId, service);

      teamContext.isSubscribed = true;
      teamContext.unsubscribe = () => {
        service.disconnect();
        teamStreamingServices.delete(teamRunId);
      };

      service.connect(teamRunId, teamContext);
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

      const teardownLocalRuntime = () => {
        if (teamContext?.isSubscribed || teamStreamingServices.has(teamRunId)) {
          this.disconnectTeamStream(teamRunId);
        }

        if (teamContext) {
          teamContext.isSubscribed = false;
          teamContext.currentStatus = AgentTeamStatus.ShutdownComplete;
          teamContext.members.forEach((member) => {
            member.state.currentStatus = AgentStatus.ShutdownComplete;
            useAgentActivityStore().clearActivities(member.state.runId);
          });
        }
      };

      if (teamRunId.startsWith('temp-')) {
        teardownLocalRuntime();
        return true;
      }

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
      teamContext.members.forEach((member) => {
        member.isSending = false;
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
      const focusedMember = teamContextsStore.focusedMemberContext;

      if (!focusedMember || !activeTeam) throw new Error('No active team context.');
      focusedMember.isSending = true;

      const isTemporary = activeTeam.teamRunId.startsWith('temp-');
      let finalTeamRunId = activeTeam.teamRunId;
      const targetMemberRouteKey = activeTeam.focusedMemberName;
      const teamResumeConfig = !isTemporary
        ? runHistoryStore.teamResumeConfigByTeamRunId[finalTeamRunId] || null
        : null;
      const draftOwner = buildTeamMemberDraftContextFileOwner(activeTeam.teamRunId, targetMemberRouteKey);

      try {
        if (isTemporary) {
          this.isLaunching = true;

          const teamDefinitionStore = useAgentTeamDefinitionStore();
          const teamDef = teamDefinitionStore.getAgentTeamDefinitionById(activeTeam.config.teamDefinitionId);
          if (!teamDef) throw new Error(`Team definition ${activeTeam.config.teamDefinitionId} not found.`);
          const leafMembers = resolveLeafTeamMembers(teamDef, {
            getTeamDefinitionById: (teamDefinitionId: string) =>
              teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
          });

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

          const memberConfigs: TeamMemberConfigInput[] = buildTeamRunMemberConfigRecords({
            config: activeTeam.config,
            leafMembers,
          }).map((memberConfig) => ({
            ...memberConfig,
            skillAccessMode: memberConfig.skillAccessMode as TeamMemberConfigInput['skillAccessMode'],
          }));

          const client = getApolloClient()
          const { data, errors } = await client.mutate<CreateAgentTeamRunMutationPayload>({
            mutation: CreateAgentTeamRun,
            variables: {
              input: {
                teamDefinitionId: activeTeam.config.teamDefinitionId,
                memberConfigs,
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

        const finalizedAttachments = await contextFileUploadStore.finalizeDraftAttachments({
          draftOwner,
          finalOwner: buildTeamMemberFinalContextFileOwner(finalTeamRunId, targetMemberRouteKey),
          attachments: contextAttachments,
        });

        const finalFocusedMember = finalTeamContext.members.get(targetMemberRouteKey);
        if (!finalFocusedMember) {
          throw new Error(`Focused member '${targetMemberRouteKey}' not found after team creation.`);
        }

        finalFocusedMember.state.conversation.messages.push({
          type: 'user',
          text,
          timestamp: new Date(),
          contextFilePaths: finalizedAttachments,
        });
        finalFocusedMember.state.conversation.updatedAt = new Date().toISOString();

        const service = await this.ensureTeamStreamConnected(finalTeamRunId);
        const streamPayload = partitionContextAttachmentsForStreaming(finalizedAttachments);
        service.sendMessage(
          text,
          targetMemberRouteKey,
          streamPayload.contextFilePaths,
          streamPayload.imageUrls,
        );
      } catch (error: any) {
        console.error(`Failed to send message to member ${focusedMember.state.runId}:`, error);
        focusedMember.isSending = false;
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
    async postToolExecutionApproval(invocationId: string, isApproved: boolean, reason: string | null = null) {
      const teamContextsStore = useAgentTeamContextsStore();
      const activeTeam = teamContextsStore.activeTeamContext;
      const focusedMember = teamContextsStore.focusedMemberContext;

      if (!activeTeam || !focusedMember) {
        console.warn('No active team or focused member for tool approval.');
        return;
      }

      const service = teamStreamingServices.get(activeTeam.teamRunId);
      const agentName = activeTeam.focusedMemberName || focusedMember.state.runId;

      if (service) {
        if (isApproved) {
          service.approveTool(invocationId, agentName, reason || undefined);
        } else {
          service.denyTool(invocationId, agentName, reason || undefined);
        }
      }

    },

    stopGeneration(teamRunId?: string): boolean {
      const teamContextsStore = useAgentTeamContextsStore();
      const activeTeam = teamContextsStore.activeTeamContext;
      const resolvedTeamRunId = (teamRunId && teamRunId.trim()) || activeTeam?.teamRunId;

      if (!resolvedTeamRunId) {
        console.warn('Cannot stop generation: no active team ID.');
        return false;
      }

      const service = teamStreamingServices.get(resolvedTeamRunId);
      if (!service) {
        console.warn(`Cannot stop generation: no streaming service for team '${resolvedTeamRunId}'.`);
        return false;
      }

      service.stopGeneration();
      return true;
    },
  },
});
