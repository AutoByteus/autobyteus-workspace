import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient'
import { v4 as uuidv4 } from 'uuid';
import { useApplicationContextStore } from './applicationContextStore';
import { SendMessageToTeam, TerminateAgentTeamRun } from '~/graphql/mutations/agentTeamRunMutations';
import type { ApplicationLaunchConfig, ApplicationRunContext } from '~/types/application/ApplicationRun';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import type {
  TeamMemberConfigInput,
  ContextFileType,
} from '~/generated/graphql';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { useApplicationLaunchProfileStore } from './applicationLaunchProfileStore';
import type { ApplicationLaunchProfile } from '~/types/application/ApplicationLaunchProfile';
import { TeamStreamingService } from '~/services/agentStreaming';
import type { TeamRunConfig, MemberConfigOverride } from '~/types/agent/TeamRunConfig';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';


function _resolveAgentLlmConfig(profile: ApplicationLaunchProfile): Record<string, string> {
  const finalConfig: Record<string, string> = {};
  const agentMembers = profile.teamDefinition.nodes.filter(n => n.referenceType === 'AGENT');

  for (const member of agentMembers) {
    finalConfig[member.memberName] = 
      profile.memberLlmConfigOverrides[member.memberName] || profile.globalLlmModelIdentifier;
  }
  return finalConfig;
}

function _resolveApplicationMemberConfigs(
  profile: ApplicationLaunchProfile
): TeamMemberConfigInput[] {
  const resolvedLlmConfig = _resolveAgentLlmConfig(profile);
  
  return profile.teamDefinition.nodes
    .filter(n => n.referenceType === 'AGENT')
    .map(memberNode => ({
      memberName: memberNode.memberName,
      llmModelIdentifier: resolvedLlmConfig[memberNode.memberName],
      workspaceId: null,
      autoExecuteTools: true,
    }));
}

// Maintain a map of streaming services per application team
const applicationStreamingServices = new Map<string, TeamStreamingService>();

type SendMessageToTeamMutationResponse = {
  sendMessageToTeam?: {
    success: boolean;
    message: string;
    teamRunId?: string | null;
  } | null;
};

export const useApplicationRunStore = defineStore('applicationRun', {
  state: () => ({
    isLaunching: false,
  }),
  actions: {
    async createProfileAndLaunchApplication(launchConfig: ApplicationLaunchConfig): Promise<{ applicationRunId: string, profileId: string }> {
      this.isLaunching = true;
      try {
        const appProfileStore = useApplicationLaunchProfileStore();

        const newProfile = appProfileStore.createLaunchProfile(
          launchConfig.appId,
          launchConfig.teamDefinition,
          {
            name: launchConfig.profileName,
            globalLlmModelIdentifier: launchConfig.globalLlmModelIdentifier,
            memberLlmConfigOverrides: launchConfig.memberLlmConfigOverrides,
          }
        );

        const applicationRunId = await this.launchApplicationFromProfile(newProfile.id);
        return { applicationRunId, profileId: newProfile.id };
      } finally {
        this.isLaunching = false;
      }
    },

    async launchApplicationFromProfile(profileId: string): Promise<string> {
      this.isLaunching = true;
      try {
        const appContextStore = useApplicationContextStore();
        const appProfileStore = useApplicationLaunchProfileStore();
        
        const profile = appProfileStore.profiles[profileId];
        if (!profile) {
          throw new Error(`Application launch profile with ID ${profileId} not found.`);
        }

        const applicationRunId = uuidv4();
        const tempTeamId = `temp-app-team-${Date.now()}`;

        const memberOverrides: Record<string, MemberConfigOverride> = {};
        for (const [memberName, modelId] of Object.entries(profile.memberLlmConfigOverrides)) {
          const node = profile.teamDefinition.nodes.find(n => n.memberName === memberName);
          if (!node || node.referenceType !== 'AGENT') continue;
          memberOverrides[memberName] = {
            agentDefinitionId: node.referenceId,
            llmModelIdentifier: modelId,
          };
        }

        const teamRunConfig: TeamRunConfig = {
          teamDefinitionId: profile.teamDefinition.id,
          teamDefinitionName: profile.teamDefinition.name,
          workspaceId: null,
          llmModelIdentifier: profile.globalLlmModelIdentifier,
          autoExecuteTools: true,
          memberOverrides,
          isLocked: false,
        };

        const resolvedLlmConfig = _resolveAgentLlmConfig(profile);
        const members = new Map<string, AgentContext>();
        for (const agentNode of profile.teamDefinition.nodes.filter(n => n.referenceType === 'AGENT')) {
          const memberName = agentNode.memberName;
          const conversation: Conversation = {
            id: `${tempTeamId}::${memberName}`,
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            agentDefinitionId: agentNode.referenceId,
          };
          const agentState = new AgentRunState(memberName, conversation);
          const agentConfig: AgentRunConfig = {
            agentDefinitionId: agentNode.referenceId,
            agentDefinitionName: memberName,
            workspaceId: null,
            llmModelIdentifier: resolvedLlmConfig[memberName],
            autoExecuteTools: true,
            skillAccessMode: 'PRELOADED_ONLY',
            isLocked: true,
          };
          members.set(memberName, new AgentContext(agentConfig, agentState));
        }
        
        const teamContext: AgentTeamContext = {
          teamId: tempTeamId,
          config: teamRunConfig,
          members: members,
          focusedMemberName: profile.teamDefinition.coordinatorMemberName,
          currentStatus: AgentTeamStatus.Uninitialized,
          isSubscribed: false,
          unsubscribe: undefined,
          taskPlan: null,
          taskStatuses: null,
        };
        
        const runContext: ApplicationRunContext = {
          applicationRunId,
          appId: profile.appId,
          launchProfileId: profile.id,
          teamContext,
        };

        appContextStore.addRun(runContext);
        appContextStore.setActiveRun(applicationRunId);
        
        return applicationRunId;
      } finally {
        this.isLaunching = false;
      }
    },

    async sendMessageToApplication(applicationRunId: string, text: string, contextPaths: { path: string, type: string }[]) {
      const appContextStore = useApplicationContextStore();
      const runContext = appContextStore.getRun(applicationRunId);
      if (!runContext) throw new Error(`Application run with ID ${applicationRunId} not found.`);
 
      const { teamContext } = runContext;
      const focusedMember = teamContext.members.get(teamContext.focusedMemberName);
      if (!focusedMember) throw new Error("Focused member not found in application context.");

      focusedMember.state.conversation.messages.push({
        type: 'user',
        text: text,
        timestamp: new Date(),
        contextFilePaths: contextPaths.map(p => ({path: p.path, type: p.type as any}))
      });
      focusedMember.state.conversation.updatedAt = new Date().toISOString();

      const isTemporary = teamContext.teamId.startsWith('temp-');

      try {
        const client = getApolloClient()
        const appProfileStore = useApplicationLaunchProfileStore();
        const profile = appProfileStore.profiles[runContext.launchProfileId];
        if (!profile) throw new Error(`Launch profile ${runContext.launchProfileId} not found for sending message.`);
        
        const memberConfigsForApi = isTemporary 
          ? _resolveApplicationMemberConfigs(profile) 
          : undefined;

        const variables: Record<string, unknown> = {
          input: {
            userInput: { content: text, contextFiles: contextPaths.map(cf => ({ path: cf.path, type: cf.type.toUpperCase() as ContextFileType })) },
            teamRunId: isTemporary ? null : teamContext.teamId,
            targetMemberName: teamContext.focusedMemberName,
            teamDefinitionId: isTemporary ? profile.teamDefinition.id : undefined,
            memberConfigs: memberConfigsForApi,
          }
        };

        const { data, errors } = await client.mutate<SendMessageToTeamMutationResponse>({
          mutation: SendMessageToTeam,
          variables,
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }

        const permanentId = data?.sendMessageToTeam?.teamRunId;

        if (!data?.sendMessageToTeam?.success || !permanentId) {
          throw new Error(data?.sendMessageToTeam?.message || 'Failed to send message.');
        }

        if (isTemporary) {
          appContextStore.promoteTemporaryTeamId(applicationRunId, permanentId);
          this.connectToApplicationStream(applicationRunId);
        }
      } catch (error: any) {
        throw new Error(`Failed to send message: ${error.message}`);
      }
    },

    connectToApplicationStream(applicationRunId: string) {
      const appContextStore = useApplicationContextStore();
      const runContext = appContextStore.getRun(applicationRunId);
      if (!runContext || runContext.teamContext.isSubscribed) return;

      const { teamContext } = runContext;

      const windowNodeContextStore = useWindowNodeContextStore();
      const wsEndpoint = windowNodeContextStore.getBoundEndpoints().teamWs;

      const service = new TeamStreamingService(wsEndpoint);
      applicationStreamingServices.set(teamContext.teamId, service);

      teamContext.isSubscribed = true;
      teamContext.unsubscribe = () => {
        service.disconnect();
        applicationStreamingServices.delete(teamContext.teamId);
      };

      service.connect(teamContext.teamId, teamContext);
    },

    async terminateApplication(applicationRunId: string) {
      const appContextStore = useApplicationContextStore();
      const runContext = appContextStore.getRun(applicationRunId);
      if (!runContext) return;

      const teamId = runContext.teamContext.teamId;

      runContext.teamContext.unsubscribe?.();
      applicationStreamingServices.delete(teamId);

      if (!teamId.startsWith('temp-')) {
        try {
          const client = getApolloClient()
          await client.mutate({
            mutation: TerminateAgentTeamRun,
            variables: { id: teamId },
          });
        } catch (error) {
          console.error(`Error terminating application team ${teamId} on backend:`, error);
        }
      }

      appContextStore.removeRun(applicationRunId);
    }
  },
});
