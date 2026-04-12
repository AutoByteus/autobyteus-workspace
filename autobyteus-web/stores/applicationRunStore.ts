import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient'
import { v4 as uuidv4 } from 'uuid';
import { useApplicationContextStore } from './applicationContextStore';
import { CreateAgentTeamRun, TerminateAgentTeamRun } from '~/graphql/mutations/agentTeamRunMutations';
import type { ApplicationLaunchConfig, ApplicationRunContext } from '~/types/application/ApplicationRun';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import type {
  TeamMemberConfigInput,
} from '~/generated/graphql';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { useApplicationLaunchProfileStore } from './applicationLaunchProfileStore';
import type { ApplicationLaunchProfile } from '~/types/application/ApplicationLaunchProfile';
import { ConnectionState, TeamStreamingService } from '~/services/agentStreaming';
import type { TeamRunConfig, MemberConfigOverride } from '~/types/agent/TeamRunConfig';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { normalizeMemberRouteKey, resolveLeafTeamMembers } from '~/utils/teamDefinitionMembers';


function _resolveAgentLlmConfig(profile: ApplicationLaunchProfile): Record<string, string> {
  const finalConfig: Record<string, string> = {};
  const teamDefinitionStore = useAgentTeamDefinitionStore();
  const agentMembers = resolveLeafTeamMembers(profile.teamDefinition, {
    getTeamDefinitionById: (teamDefinitionId: string) =>
      teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
  });

  for (const member of agentMembers) {
    finalConfig[member.memberName] = 
      profile.memberLlmConfigOverrides[member.memberName] || profile.globalLlmModelIdentifier;
  }
  return finalConfig;
}

function _resolveApplicationMemberConfigs(
  profile: ApplicationLaunchProfile
): TeamMemberConfigInput[] {
  const teamDefinitionStore = useAgentTeamDefinitionStore();
  const resolvedLlmConfig = _resolveAgentLlmConfig(profile);
  const leafMembers = resolveLeafTeamMembers(profile.teamDefinition, {
    getTeamDefinitionById: (teamDefinitionId: string) =>
      teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
  });
  
  return leafMembers
    .map((member) => ({
      memberName: member.memberName,
      memberRouteKey: member.memberRouteKey,
      agentDefinitionId: member.agentDefinitionId,
      runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
      llmModelIdentifier: resolvedLlmConfig[member.memberName],
      workspaceId: null,
      autoExecuteTools: true,
      skillAccessMode: 'PRELOADED_ONLY' as const,
    }));
}

// Maintain a map of streaming services per application team
const applicationStreamingServices = new Map<string, TeamStreamingService>();

interface CreateAgentTeamRunMutationPayload {
  createAgentTeamRun?: {
    success?: boolean;
    message?: string;
    teamRunId?: string | null;
  } | null;
}

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
        const teamDefinitionStore = useAgentTeamDefinitionStore();
        const leafMembers = resolveLeafTeamMembers(profile.teamDefinition, {
          getTeamDefinitionById: (teamDefinitionId: string) =>
            teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
        });

        const applicationRunId = uuidv4();
        const temporaryTeamRunId = `temp-app-team-${Date.now()}`;

        const memberOverrides: Record<string, MemberConfigOverride> = {};
        for (const [memberName, modelId] of Object.entries(profile.memberLlmConfigOverrides)) {
          const node = leafMembers.find((member) => member.memberName === memberName);
          if (!node) continue;
          memberOverrides[memberName] = {
            agentDefinitionId: node.agentDefinitionId,
            llmModelIdentifier: modelId,
          };
        }

        const teamRunConfig: TeamRunConfig = {
          teamDefinitionId: profile.teamDefinition.id,
          teamDefinitionName: profile.teamDefinition.name,
          runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
          workspaceId: null,
          llmModelIdentifier: profile.globalLlmModelIdentifier,
          autoExecuteTools: true,
          skillAccessMode: 'PRELOADED_ONLY',
          memberOverrides,
          isLocked: false,
        };

        const resolvedLlmConfig = _resolveAgentLlmConfig(profile);
        const members = new Map<string, AgentContext>();
        for (const member of leafMembers) {
          const memberName = member.memberName;
          const conversation: Conversation = {
            id: `${temporaryTeamRunId}::${member.memberRouteKey}`,
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            agentDefinitionId: member.agentDefinitionId,
          };
          const agentState = new AgentRunState(conversation.id, conversation);
          const agentConfig: AgentRunConfig = {
            agentDefinitionId: member.agentDefinitionId,
            agentDefinitionName: memberName,
            workspaceId: null,
            llmModelIdentifier: resolvedLlmConfig[memberName],
            runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
            autoExecuteTools: true,
            skillAccessMode: 'PRELOADED_ONLY',
            isLocked: true,
          };
          members.set(member.memberRouteKey, new AgentContext(agentConfig, agentState));
        }
        const coordinatorMemberRouteKey = normalizeMemberRouteKey(
          profile.teamDefinition.coordinatorMemberName,
        );
        
        const teamContext: AgentTeamContext = {
          teamRunId: temporaryTeamRunId,
          config: teamRunConfig,
          members: members,
          coordinatorMemberRouteKey,
          focusedMemberName: members.has(coordinatorMemberRouteKey)
            ? coordinatorMemberRouteKey
            : (members.keys().next().value || ''),
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

      const isTemporary = teamContext.teamRunId.startsWith('temp-');

      try {
        const appProfileStore = useApplicationLaunchProfileStore();
        const profile = appProfileStore.profiles[runContext.launchProfileId];
        if (!profile) throw new Error(`Launch profile ${runContext.launchProfileId} not found for sending message.`);
        if (isTemporary) {
          const client = getApolloClient()
          const { data, errors } = await client.mutate<CreateAgentTeamRunMutationPayload>({
            mutation: CreateAgentTeamRun,
            variables: {
              input: {
                teamDefinitionId: profile.teamDefinition.id,
                memberConfigs: _resolveApplicationMemberConfigs(profile),
              },
            },
          });

          if (errors && errors.length > 0) {
            throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
          }

          const result = data?.createAgentTeamRun;
          if (!result) {
            throw new Error('Failed to create team run: No response returned.');
          }
          if (!result.success || !result.teamRunId) {
            throw new Error(result.message || 'Failed to create team run.');
          }

          appContextStore.promoteTemporaryTeamRunId(applicationRunId, result.teamRunId);
        }

        const service = await this.ensureApplicationStreamConnected(applicationRunId);
        const streamPayload = partitionContextPaths(contextPaths);
        service.sendMessage(
          text,
          teamContext.focusedMemberName,
          streamPayload.contextFilePaths,
          streamPayload.imageUrls,
        );
      } catch (error: any) {
        throw new Error(`Failed to send message: ${error.message}`);
      }
    },

    connectToApplicationStream(applicationRunId: string): TeamStreamingService | null {
      const appContextStore = useApplicationContextStore();
      const runContext = appContextStore.getRun(applicationRunId);
      if (!runContext) return null;

      const { teamContext } = runContext;
      const existingService = applicationStreamingServices.get(teamContext.teamRunId);
      if (existingService) {
        existingService.attachContext(teamContext);
        teamContext.unsubscribe = () => {
          existingService.disconnect();
          applicationStreamingServices.delete(teamContext.teamRunId);
        };
        if (existingService.connectionState === ConnectionState.DISCONNECTED) {
          existingService.connect(teamContext.teamRunId, teamContext);
          teamContext.isSubscribed = true;
        } else {
          teamContext.isSubscribed = true;
        }
        return existingService;
      }

      const windowNodeContextStore = useWindowNodeContextStore();
      const wsEndpoint = windowNodeContextStore.getBoundEndpoints().teamWs;

      const service = new TeamStreamingService(wsEndpoint);
      applicationStreamingServices.set(teamContext.teamRunId, service);

      teamContext.isSubscribed = true;
      teamContext.unsubscribe = () => {
        service.disconnect();
        applicationStreamingServices.delete(teamContext.teamRunId);
      };

      service.connect(teamContext.teamRunId, teamContext);
      return service;
    },

    async ensureApplicationStreamConnected(applicationRunId: string): Promise<TeamStreamingService> {
      const service = this.connectToApplicationStream(applicationRunId);
      if (!service) {
        throw new Error(`Unable to connect application stream for run '${applicationRunId}'.`);
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

      throw new Error(`Timed out waiting for application team stream connection for run '${applicationRunId}'.`);
    },

    async terminateApplication(applicationRunId: string) {
      const appContextStore = useApplicationContextStore();
      const runContext = appContextStore.getRun(applicationRunId);
      if (!runContext) return;

      const teamRunId = runContext.teamContext.teamRunId;

      runContext.teamContext.unsubscribe?.();
      applicationStreamingServices.delete(teamRunId);

      if (!teamRunId.startsWith('temp-')) {
        try {
          const client = getApolloClient()
          await client.mutate({
            mutation: TerminateAgentTeamRun,
            variables: { id: teamRunId },
          });
        } catch (error) {
          console.error(`Error terminating application team ${teamRunId} on backend:`, error);
        }
      }

      appContextStore.removeRun(applicationRunId);
    }
  },
});

const partitionContextPaths = (
  contextPaths: { path: string; type: string }[],
): { contextFilePaths: string[]; imageUrls: string[] } => {
  const contextFilePaths: string[] = [];
  const imageUrls: string[] = [];

  for (const contextPath of contextPaths) {
    if (!contextPath.path) {
      continue;
    }
    if (contextPath.type.toUpperCase() === 'IMAGE') {
      imageUrls.push(contextPath.path);
      continue;
    }
    contextFilePaths.push(contextPath.path);
  }

  return { contextFilePaths, imageUrls };
};
