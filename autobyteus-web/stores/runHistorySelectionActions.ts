import { getApolloClient } from '~/utils/apolloClient';
import {
  GetTeamMemberRunProjection,
  GetTeamRunResumeConfig,
} from '~/graphql/queries/runHistoryQueries';
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type {
  GetTeamRunResumeConfigQueryData,
  TeamMemberTreeRow,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { parseTeamRunManifest, toTeamMemberKey } from '~/stores/runHistoryManifest';
import {
  buildTeamMemberContexts,
  fetchTeamMemberProjections,
} from '~/stores/runHistoryTeamHelpers';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';

interface RunHistorySelectionStoreLike {
  openingRun: boolean;
  error: string | null;
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  selectedTeamMemberRouteKey: string | null;
  teamResumeConfigByTeamRunId: Record<string, TeamRunResumeConfigPayload>;
  openTeamMemberRun(teamRunId: string, memberRouteKey: string): Promise<void>;
  openRun(runId: string): Promise<void>;
  ensureWorkspaceByRootPath(rootPath: string): Promise<string | null>;
}

export const openTeamMemberRunFromHistory = async (
  store: RunHistorySelectionStoreLike,
  teamRunId: string,
  memberRouteKey: string,
): Promise<void> => {
  store.openingRun = true;
  store.error = null;
  try {
    const client = getApolloClient();
    const { data, errors } = await client.query<GetTeamRunResumeConfigQueryData>({
      query: GetTeamRunResumeConfig,
      variables: { teamRunId },
      fetchPolicy: 'network-only',
    });

    if (errors && errors.length > 0) {
      throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
    }

    const resumeConfig = data?.getTeamRunResumeConfig;
    if (!resumeConfig) {
      throw new Error(`Team resume config payload missing for '${teamRunId}'.`);
    }
    const manifest = parseTeamRunManifest(resumeConfig.manifest);
    if (!manifest.teamRunId) {
      throw new Error(`Team manifest is invalid for '${teamRunId}'.`);
    }

    store.teamResumeConfigByTeamRunId[teamRunId] = {
      teamRunId: manifest.teamRunId,
      isActive: resumeConfig.isActive,
      manifest,
    };

    const teamContextsStore = useAgentTeamContextsStore();
    const selectionStore = useAgentSelectionStore();
    const projectionByMemberRouteKey = await fetchTeamMemberProjections({
      client,
      getTeamMemberRunProjectionQuery: GetTeamMemberRunProjection,
      teamRunId,
      manifest,
      toTeamMemberKey,
    });

    const { members, firstWorkspaceId } = await buildTeamMemberContexts({
      teamRunId,
      manifest,
      isActive: resumeConfig.isActive,
      projectionByMemberRouteKey,
      toTeamMemberKey,
      ensureWorkspaceByRootPath: (path: string) => store.ensureWorkspaceByRootPath(path),
    });

    const firstMemberKey = manifest.memberBindings
      .map((member) => toTeamMemberKey(member).trim())
      .find((memberKey) => memberKey.length > 0) || '';
    const focusKey = members.has(memberRouteKey) ? memberRouteKey : firstMemberKey;
    if (!focusKey) {
      throw new Error(`Team '${teamRunId}' has no members in manifest.`);
    }

    const focusedBinding = manifest.memberBindings.find(
      (member) => toTeamMemberKey(member).trim() === focusKey,
    );

    teamContextsStore.addTeamContext({
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
      focusedMemberName: focusKey,
      currentStatus: resumeConfig.isActive ? AgentTeamStatus.Uninitialized : AgentTeamStatus.Idle,
      isSubscribed: false,
      taskPlan: null,
      taskStatuses: null,
    });

    selectionStore.selectRun(manifest.teamRunId, 'team');
    store.selectedTeamRunId = manifest.teamRunId;
    store.selectedTeamMemberRouteKey = focusKey;
    store.selectedRunId = null;
    useTeamRunConfigStore().clearConfig();
    useAgentRunConfigStore().clearConfig();

    if (resumeConfig.isActive) {
      useAgentTeamRunStore().connectToTeamStream(manifest.teamRunId);
    } else {
      const activeTeam = teamContextsStore.getTeamContextById(manifest.teamRunId);
      if (activeTeam?.unsubscribe) {
        activeTeam.unsubscribe();
        activeTeam.isSubscribed = false;
      }
    }
  } catch (error: any) {
    store.error = error?.message || `Failed to open team '${teamRunId}'.`;
    throw error;
  } finally {
    store.openingRun = false;
  }
};

export const selectTreeRunFromHistory = async (
  store: RunHistorySelectionStoreLike,
  row: RunTreeRow | TeamMemberTreeRow,
): Promise<void> => {
  if ('teamRunId' in row) {
    const teamContextsStore = useAgentTeamContextsStore();
    const selectionStore = useAgentSelectionStore();
    const localTeamContext = teamContextsStore.getTeamContextById(row.teamRunId);
    if (localTeamContext) {
      teamContextsStore.setFocusedMember?.(row.memberRouteKey);
      selectionStore.selectRun(row.teamRunId, 'team');
      store.selectedTeamRunId = row.teamRunId;
      store.selectedTeamMemberRouteKey = row.memberRouteKey;
      store.selectedRunId = null;
      useTeamRunConfigStore().clearConfig();
      useAgentRunConfigStore().clearConfig();
      return;
    }
    await store.openTeamMemberRun(row.teamRunId, row.memberRouteKey);
    return;
  }

  if (row.source === 'history') {
    await store.openRun(row.runId);
    return;
  }

  const contextsStore = useAgentContextsStore();
  const context = contextsStore.getRun(row.runId);
  if (!context) {
    return;
  }

  const selectionStore = useAgentSelectionStore();
  selectionStore.selectRun(row.runId, 'agent');
  store.selectedRunId = row.runId;
  store.selectedTeamRunId = null;
  store.selectedTeamMemberRouteKey = null;
  useTeamRunConfigStore().clearConfig();
  useAgentRunConfigStore().clearConfig();
};
