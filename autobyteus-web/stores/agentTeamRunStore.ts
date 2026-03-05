import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient'
import { TerminateAgentTeamRun, SendMessageToTeam } from '~/graphql/mutations/agentTeamRunMutations';
import type {
  ContextFileType,
  TeamMemberConfigInput,
} from '~/generated/graphql';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { ConnectionState, TeamStreamingService } from '~/services/agentStreaming';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

// Maintain a map of streaming services per team run
const teamStreamingServices = new Map<string, TeamStreamingService>();

interface SendMessageToTeamMutationPayload {
  sendMessageToTeam?: {
    success?: boolean;
    message?: string;
    teamRunId?: string | null;
  } | null;
}

interface SendMessageToTeamMutationVariablesPayload {
  input: Record<string, unknown>;
}

export const useAgentTeamRunStore = defineStore('agentTeamRun', {
  state: () => ({
    isLaunching: false,
  }),

  actions: {
    /**
     * Establish WebSocket connection for a team run.
     */
    connectToTeamStream(teamRunId: string) {
      const teamContextsStore = useAgentTeamContextsStore();
      const teamContext = teamContextsStore.getTeamContextById(teamRunId);

      if (!teamContext) {
        console.warn(`Could not find team context for ID ${teamRunId} to connect stream.`);
        return;
      }

      const existingService = teamStreamingServices.get(teamRunId);
      if (existingService) {
        if (existingService.connectionState === ConnectionState.DISCONNECTED) {
          existingService.connect(teamRunId, teamContext);
          teamContext.isSubscribed = true;
        }
        return;
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
    },

    async terminateTeamRun(teamRunId: string) {
      const teamContextsStore = useAgentTeamContextsStore();
      const teamContext = teamContextsStore.getTeamContextById(teamRunId);

      if (teamContext?.unsubscribe) {
        teamContext.unsubscribe();
        teamContext.unsubscribe = undefined;
      }
      teamStreamingServices.delete(teamRunId);

      if (teamContext) {
        teamContext.isSubscribed = false;
        teamContext.currentStatus = AgentTeamStatus.ShutdownComplete;
        teamContext.members.forEach((member) => {
          member.state.currentStatus = AgentStatus.ShutdownComplete;
          useAgentActivityStore().clearActivities(member.state.runId);
        });
      }

      if (teamRunId.startsWith('temp-')) return;

      try {
        const client = getApolloClient()
        await client.mutate({
          mutation: TerminateAgentTeamRun,
          variables: { id: teamRunId },
        });
      } catch (error) {
        console.error(`Error terminating team ${teamRunId} on backend:`, error);
      }
    },

    async terminateActiveTeam() {
      const activeTeam = useAgentTeamContextsStore().activeTeamContext;
      if (activeTeam) {
        await this.terminateTeamRun(activeTeam.teamRunId);
      }
    },

    async sendMessageToFocusedMember(text: string, contextPaths: { path: string; type: string }[]) {
      const teamContextsStore = useAgentTeamContextsStore();
      const runHistoryStore = useRunHistoryStore();
      const activeTeam = teamContextsStore.activeTeamContext;
      const focusedMember = teamContextsStore.focusedMemberContext;

      if (!focusedMember || !activeTeam) throw new Error('No active team context.');

      focusedMember.state.conversation.messages.push({
        type: 'user',
        text,
        timestamp: new Date(),
        contextFilePaths: contextPaths.map(p => ({ path: p.path, type: p.type as any }))
      });
      focusedMember.state.conversation.updatedAt = new Date().toISOString();
      focusedMember.isSending = true;

      const isTemporary = activeTeam.teamRunId.startsWith('temp-');

      try {
        const client = getApolloClient()
        let variables: SendMessageToTeamMutationVariablesPayload;

        if (isTemporary) {
          this.isLaunching = true;

          const teamDefinitionStore = useAgentTeamDefinitionStore();
          const teamDef = teamDefinitionStore.getAgentTeamDefinitionById(activeTeam.config.teamDefinitionId);
          if (!teamDef) throw new Error(`Team definition ${activeTeam.config.teamDefinitionId} not found.`);

          const memberConfigs: TeamMemberConfigInput[] = teamDef.nodes
            .filter(node => node.referenceType === 'AGENT')
            .map((node) => {
              const override = activeTeam.config.memberOverrides[node.memberName];
              const teamRuntimeKind = activeTeam.config.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND;
              return {
                memberName: node.memberName,
                agentDefinitionId: node.referenceId,
                runtimeKind: teamRuntimeKind,
                llmModelIdentifier: override?.llmModelIdentifier || activeTeam.config.llmModelIdentifier,
                workspaceId: activeTeam.config.workspaceId,
                autoExecuteTools: override?.autoExecuteTools ?? activeTeam.config.autoExecuteTools,
                llmConfig: override?.llmConfig ?? null,
              };
            });

          variables = {
            input: {
              userInput: {
                content: text,
                contextFiles: contextPaths.map(cf => ({
                  path: cf.path,
                  type: cf.type.toUpperCase() as ContextFileType
                })),
              },
              teamRunId: null,
              targetMemberName: activeTeam.focusedMemberName,
              teamDefinitionId: activeTeam.config.teamDefinitionId,
              memberConfigs,
            }
          };
        } else {
          variables = {
            input: {
              userInput: {
                content: text,
                contextFiles: contextPaths.map(cf => ({
                  path: cf.path,
                  type: cf.type.toUpperCase() as ContextFileType
                })),
              },
              teamRunId: activeTeam.teamRunId,
              targetMemberName: activeTeam.focusedMemberName,
            }
          };
        }

        const { data, errors } = await client.mutate<
          SendMessageToTeamMutationPayload,
          SendMessageToTeamMutationVariablesPayload
        >({
          mutation: SendMessageToTeam,
          variables,
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }

        const teamRunId = data?.sendMessageToTeam?.teamRunId;
        if (!data?.sendMessageToTeam?.success || !teamRunId) {
          throw new Error(data?.sendMessageToTeam?.message || 'Failed to send message.');
        }

        runHistoryStore.markTeamAsActive(teamRunId);
        void runHistoryStore.refreshTreeQuietly();

        if (isTemporary) {
          teamContextsStore.promoteTemporaryTeamRunId(activeTeam.teamRunId, teamRunId);
          teamContextsStore.lockConfig(teamRunId);
        }

        const teamContextAfterSend = teamContextsStore.getTeamContextById(teamRunId);
        const activeService = teamStreamingServices.get(teamRunId);
        const streamDisconnected =
          !activeService || activeService.connectionState === ConnectionState.DISCONNECTED;
        if (teamContextAfterSend && (!teamContextAfterSend.isSubscribed || streamDisconnected)) {
          this.connectToTeamStream(teamRunId);
        }
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

      if (activeTeam?.teamRunId === resolvedTeamRunId) {
        const focusedMember = teamContextsStore.focusedMemberContext;
        if (focusedMember) {
          focusedMember.isSending = false;
        }
      }

      return true;
    },
  },
});
