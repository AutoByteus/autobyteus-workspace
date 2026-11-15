import { watch } from 'vue';
import { useAgentSelectionStore, type WorkspaceSelectionIntent } from '~/stores/agentSelectionStore';
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
): TeamMemberInspectionAttempt => {
  store.teamMemberInspectionByIdentity = {
    ...store.teamMemberInspectionByIdentity,
    [teamMemberInspectionIdentity(teamRunId, agentRunId)]: { state: 'loading', detail: null },
  };
  return store.teamMemberInspectionByIdentity[teamMemberInspectionIdentity(teamRunId, agentRunId)]!;
};

export const setTeamMemberInspectionError = (
  store: TeamMemberInspectionAttemptStoreState,
  teamRunId: string,
  agentRunId: string,
  detail: string,
): TeamMemberInspectionAttempt => {
  store.teamMemberInspectionByIdentity = {
    ...store.teamMemberInspectionByIdentity,
    [teamMemberInspectionIdentity(teamRunId, agentRunId)]: { state: 'error', detail },
  };
  return store.teamMemberInspectionByIdentity[teamMemberInspectionIdentity(teamRunId, agentRunId)]!;
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
  options: { selectionMode?: TeamMemberInspectionSelectionMode; selectionIntent?: WorkspaceSelectionIntent } = {},
): Promise<TeamMemberInspectionResult> => {
  const intent = options.selectionIntent ?? useAgentSelectionStore().beginSelectionIntent();
  if (!intent.isCurrent()) return { disposition: 'superseded' };
  const attempt = setTeamMemberInspectionLoading(store, teamRunId, agentRunId);
  const key = teamMemberInspectionIdentity(teamRunId, agentRunId);
  const clearOwned = () => {
    if (store.teamMemberInspectionByIdentity[key] === attempt) clearTeamMemberInspectionAttempt(store, teamRunId, agentRunId);
  };
  const stopWatching = watch(intent.isCurrent, (current) => { if (!current) clearOwned(); }, { flush: 'sync' });
  store.error = null;
  const result = await inspectMountedTeamMember({
    teamRunId,
    agentRunId,
    selectionIntent: intent,
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
      clearOwned();
    },
  });
  stopWatching();
  if (result.disposition === 'superseded') clearOwned();
  if (result.disposition === 'rejected' && intent.isCurrent() && store.teamMemberInspectionByIdentity[key] === attempt) {
    setTeamMemberInspectionError(store, teamRunId, agentRunId, result.message);
  }
  return result;
};

export const reconcileFocusedTeamMemberProjectionForStore = async (
  store: RunHistoryTeamMemberInspectionStoreState,
  teamRunId: string,
  agentRunId: string,
): Promise<void> => {
  const attempt = setTeamMemberInspectionLoading(store, teamRunId, agentRunId);
  const ownsAttempt = () => store.teamMemberInspectionByIdentity[teamMemberInspectionIdentity(teamRunId, agentRunId)] === attempt;
  try {
    const team = useAgentTeamContextsStore().getTeamContextById(teamRunId);
    if (!team || team.view.getFocusedAgentRunId() !== agentRunId) {
      if (ownsAttempt()) clearTeamMemberInspectionAttempt(store, teamRunId, agentRunId);
      return;
    }
    await ensureAuthoritativeTeamMemberProjection({ team, agentRunId });
    if (useAgentTeamContextsStore().getTeamContextById(teamRunId) !== team
      || team.view.getFocusedAgentRunId() !== agentRunId) {
      if (ownsAttempt()) clearTeamMemberInspectionAttempt(store, teamRunId, agentRunId);
      return;
    }
    refreshRunNavigationTopologyForStore(store, 'team-member-projection-reconcile');
    if (ownsAttempt()) clearTeamMemberInspectionAttempt(store, teamRunId, agentRunId);
  } catch (error) {
    if (ownsAttempt()) setTeamMemberInspectionError(
      store,
      teamRunId,
      agentRunId,
      error instanceof Error ? error.message : String(error),
    );
  }
};
