import { getApolloClient } from '~/utils/apolloClient';
import {
  GetTeamMemberRunProjection,
  GetTeamRunResumeConfig,
} from '~/graphql/queries/runHistoryQueries';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type {
  GetTeamRunResumeConfigQueryData,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import { parseTeamRunManifest, toTeamMemberKey } from '~/stores/runHistoryManifest';
import {
  buildTeamMemberContexts,
  fetchTeamMemberProjections,
} from '~/stores/runHistoryTeamHelpers';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';

export interface OpenTeamRunWithCoordinatorInput {
  teamRunId: string;
  memberRouteKey?: string | null;
  ensureWorkspaceByRootPath: (rootPath: string) => Promise<string | null>;
  selectRun?: boolean;
}

export interface OpenTeamRunWithCoordinatorResult {
  teamRunId: string;
  focusedMemberRouteKey: string;
  resumeConfig: TeamRunResumeConfigPayload;
}

const resolveFocusKey = (params: {
  requestedMemberRouteKey?: string | null;
  coordinatorMemberRouteKey?: string | null;
  availableMemberRouteKeys: string[];
}): string => {
  const requestedKey = params.requestedMemberRouteKey?.trim() || '';
  if (requestedKey && params.availableMemberRouteKeys.includes(requestedKey)) {
    return requestedKey;
  }

  const coordinatorKey = params.coordinatorMemberRouteKey?.trim() || '';
  if (coordinatorKey && params.availableMemberRouteKeys.includes(coordinatorKey)) {
    return coordinatorKey;
  }

  return params.availableMemberRouteKeys[0] || '';
};

export const openTeamRunWithCoordinator = async (
  input: OpenTeamRunWithCoordinatorInput,
): Promise<OpenTeamRunWithCoordinatorResult> => {
  const client = getApolloClient();
  const { data, errors } = await client.query<GetTeamRunResumeConfigQueryData>({
    query: GetTeamRunResumeConfig,
    variables: { teamRunId: input.teamRunId },
    fetchPolicy: 'network-only',
  });

  if (errors && errors.length > 0) {
    throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
  }

  const resumeConfigPayload = data?.getTeamRunResumeConfig;
  if (!resumeConfigPayload) {
    throw new Error(`Team resume config payload missing for '${input.teamRunId}'.`);
  }

  const manifest = parseTeamRunManifest(resumeConfigPayload.manifest);
  if (!manifest.teamRunId) {
    throw new Error(`Team manifest is invalid for '${input.teamRunId}'.`);
  }

  const resumeConfig: TeamRunResumeConfigPayload = {
    teamRunId: manifest.teamRunId,
    isActive: resumeConfigPayload.isActive,
    manifest,
  };

  const projectionByMemberRouteKey = await fetchTeamMemberProjections({
    client,
    getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection,
    teamRunId: manifest.teamRunId,
    manifest,
    toTeamMemberKey,
  });

  const { members, firstWorkspaceId } = await buildTeamMemberContexts({
    teamRunId: manifest.teamRunId,
    manifest,
    isActive: resumeConfig.isActive,
    projectionByMemberRouteKey,
    toTeamMemberKey,
    ensureWorkspaceByRootPath: input.ensureWorkspaceByRootPath,
  });

  const availableMemberRouteKeys = Array.from(members.keys());
  const focusedMemberRouteKey = resolveFocusKey({
    requestedMemberRouteKey: input.memberRouteKey,
    coordinatorMemberRouteKey: manifest.coordinatorMemberRouteKey,
    availableMemberRouteKeys,
  });

  if (!focusedMemberRouteKey) {
    throw new Error(`Team '${manifest.teamRunId}' has no members in manifest.`);
  }

  const focusedBinding = manifest.memberBindings.find(
    (member) => toTeamMemberKey(member).trim() === focusedMemberRouteKey,
  );

  const teamContextsStore = useAgentTeamContextsStore();
  const hydratedContext = {
    teamRunId: manifest.teamRunId,
    config: {
      teamDefinitionId: manifest.teamDefinitionId,
      teamDefinitionName: manifest.teamDefinitionName,
      runtimeKind: focusedBinding?.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND,
      workspaceId: firstWorkspaceId,
      llmModelIdentifier: focusedBinding?.llmModelIdentifier || '',
      autoExecuteTools: focusedBinding?.autoExecuteTools ?? false,
      memberOverrides: Object.fromEntries(
        manifest.memberBindings.map((member) => [
          member.memberName,
          {
            agentDefinitionId: member.agentDefinitionId,
            llmModelIdentifier: member.llmModelIdentifier,
            autoExecuteTools: member.autoExecuteTools,
            llmConfig: member.llmConfig ?? null,
          },
        ]),
      ),
      isLocked: resumeConfig.isActive,
    },
    members,
    focusedMemberName: focusedMemberRouteKey,
    currentStatus: resumeConfig.isActive ? AgentTeamStatus.Uninitialized : AgentTeamStatus.Idle,
    isSubscribed: false,
    taskPlan: null,
    taskStatuses: null,
  };

  const existingTeamContext = teamContextsStore.getTeamContextById(manifest.teamRunId);
  const shouldKeepLiveContext = resumeConfig.isActive && Boolean(existingTeamContext?.isSubscribed);

  if (existingTeamContext) {
    if (!shouldKeepLiveContext && existingTeamContext.unsubscribe) {
      existingTeamContext.unsubscribe();
    }

    existingTeamContext.config = hydratedContext.config;
    existingTeamContext.focusedMemberName = focusedMemberRouteKey;

    if (shouldKeepLiveContext) {
      const refreshedMembers = new Map();
      for (const [memberRouteKey, memberContext] of members.entries()) {
        const existingMemberContext = existingTeamContext.members.get(memberRouteKey);
        if (existingMemberContext) {
          existingMemberContext.config = memberContext.config;
          refreshedMembers.set(memberRouteKey, existingMemberContext);
        } else {
          refreshedMembers.set(memberRouteKey, memberContext);
        }
      }
      existingTeamContext.members = refreshedMembers;
    } else {
      existingTeamContext.members = members;
      existingTeamContext.currentStatus = hydratedContext.currentStatus;
      existingTeamContext.isSubscribed = false;
      existingTeamContext.unsubscribe = undefined;
      existingTeamContext.taskPlan = null;
      existingTeamContext.taskStatuses = null;
    }
  } else {
    teamContextsStore.addTeamContext(hydratedContext);
  }

  if (input.selectRun !== false) {
    useAgentSelectionStore().selectRun(manifest.teamRunId, 'team');
    useTeamRunConfigStore().clearConfig();
    useAgentRunConfigStore().clearConfig();
  }

  if (resumeConfig.isActive) {
    useAgentTeamRunStore().connectToTeamStream(manifest.teamRunId);
  } else {
    const hydratedTeam = teamContextsStore.getTeamContextById(manifest.teamRunId);
    if (hydratedTeam?.unsubscribe) {
      hydratedTeam.unsubscribe();
      hydratedTeam.isSubscribed = false;
    }
  }

  return {
    teamRunId: manifest.teamRunId,
    focusedMemberRouteKey,
    resumeConfig,
  };
};
