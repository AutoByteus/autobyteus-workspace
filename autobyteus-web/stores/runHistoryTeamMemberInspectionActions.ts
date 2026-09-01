import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { inspectMountedTeamMember, type TeamMemberInspectionResult } from '~/services/runOpen/teamMemberInspectionCoordinator';
import { refreshRunNavigationTopologyForStore, type RunHistoryNavigationStoreState } from './runHistoryNavigationStoreActions';
import type { TeamMemberInspectionAttempt } from './runHistoryTypes';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { ensureAuthoritativeTeamMemberProjection } from '~/services/runHydration/teamMemberProjectionHydrationService';

export type TeamMemberInspectionSelectionMode = 'desktop' | 'mobile';

export interface TeamMemberInspectionAttemptStoreState {
  teamMemberInspectionByIdentity: Record<string, TeamMemberInspectionAttempt | undefined>;
}

export interface RunHistoryTeamMemberInspectionStoreState extends RunHistoryNavigationStoreState, TeamMemberInspectionAttemptStoreState {
  error: string | null;
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  selectedTeamMemberAddress: string | null;
}

export const teamMemberInspectionIdentity = (
  teamRunId: string,
  agentRunId: string,
): string => `${teamRunId.trim()}\u0000${agentRunId.trim()}`;

export const setTeamMemberInspectionLoading = (
  store: TeamMemberInspectionAttemptStoreState,
  teamRunId: string,
  agentRunId: string,
): void => {
  store.teamMemberInspectionByIdentity = {
    ...store.teamMemberInspectionByIdentity,
    [teamMemberInspectionIdentity(teamRunId, agentRunId)]: { state: 'loading', detail: null },
  };
};

export const setTeamMemberInspectionError = (
  store: TeamMemberInspectionAttemptStoreState,
  teamRunId: string,
  agentRunId: string,
  detail: string,
): void => {
  store.teamMemberInspectionByIdentity = {
    ...store.teamMemberInspectionByIdentity,
    [teamMemberInspectionIdentity(teamRunId, agentRunId)]: { state: 'error', detail },
  };
};

export const clearTeamMemberInspectionAttempt = (
  store: TeamMemberInspectionAttemptStoreState,
  teamRunId: string,
  agentRunId: string,
): void => {
  const key = teamMemberInspectionIdentity(teamRunId, agentRunId);
  if (!(key in store.teamMemberInspectionByIdentity)) return;
  const next = { ...store.teamMemberInspectionByIdentity };
  delete next[key];
  store.teamMemberInspectionByIdentity = next;
};

export const inspectTeamMemberForStore = async (
  store: RunHistoryTeamMemberInspectionStoreState,
  teamRunId: string,
  agentRunId: string,
  options: { selectionMode?: TeamMemberInspectionSelectionMode } = {},
): Promise<TeamMemberInspectionResult> => {
  setTeamMemberInspectionLoading(store, teamRunId, agentRunId);
  store.error = null;
  const result = await inspectMountedTeamMember({
    teamRunId,
    agentRunId,
    commit: ({ teamRunId: committedTeamRunId, agentRunId: committedAgentRunId, memberAddress }) => {
      refreshRunNavigationTopologyForStore(store, 'team-member-inspection');
      const selection = useAgentSelectionStore();
      options.selectionMode === 'mobile'
        ? selection.selectRunWithoutShellNavigation(committedTeamRunId, 'team')
        : selection.selectRun(committedTeamRunId, 'team');
      store.selectedTeamRunId = committedTeamRunId;
      store.selectedTeamMemberAddress = memberAddress;
      store.selectedRunId = null;
      useTeamRunConfigStore().clearConfig();
      useAgentRunConfigStore().clearConfig();
      clearTeamMemberInspectionAttempt(store, committedTeamRunId, committedAgentRunId);
    },
  });
  if (result.disposition === 'rejected') {
    setTeamMemberInspectionError(store, teamRunId, agentRunId, result.message);
  }
  return result;
};

export const reconcileFocusedTeamMemberProjectionForStore = async (
  store: RunHistoryTeamMemberInspectionStoreState,
  teamRunId: string,
  agentRunId: string,
): Promise<void> => {
  setTeamMemberInspectionLoading(store, teamRunId, agentRunId);
  try {
    const team = useAgentTeamContextsStore().getTeamContextById(teamRunId);
    if (!team || team.view.getFocusedAgentRunId() !== agentRunId) {
      clearTeamMemberInspectionAttempt(store, teamRunId, agentRunId);
      return;
    }
    await ensureAuthoritativeTeamMemberProjection({ team, agentRunId });
    if (useAgentTeamContextsStore().getTeamContextById(teamRunId) !== team
      || team.view.getFocusedAgentRunId() !== agentRunId) {
      clearTeamMemberInspectionAttempt(store, teamRunId, agentRunId);
      return;
    }
    refreshRunNavigationTopologyForStore(store, 'team-member-projection-reconcile');
    clearTeamMemberInspectionAttempt(store, teamRunId, agentRunId);
  } catch (error) {
    setTeamMemberInspectionError(
      store,
      teamRunId,
      agentRunId,
      error instanceof Error ? error.message : String(error),
    );
  }
};
