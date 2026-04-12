import type {
  TeamMemberTreeRow,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator';

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
    const result = await openTeamRun({
      teamRunId,
      memberRouteKey,
      ensureWorkspaceByRootPath: (path: string) => store.ensureWorkspaceByRootPath(path),
    });

    store.teamResumeConfigByTeamRunId[result.resumeConfig.teamRunId] = result.resumeConfig;
    store.selectedTeamRunId = result.teamRunId;
    store.selectedTeamMemberRouteKey = result.focusedMemberRouteKey;
    store.selectedRunId = null;
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
    const shouldReuseLocalTeamContext = Boolean(
      localTeamContext && localTeamContext.members.has(row.memberRouteKey),
    );
    const localMemberProjectionLoadState =
      localTeamContext?.historicalHydration?.memberProjectionLoadStateByRouteKey[row.memberRouteKey]
      ?? null;
    const shouldShowOpeningIndicator = Boolean(localTeamContext?.historicalHydration)
      && localMemberProjectionLoadState !== 'loaded';

    if (shouldReuseLocalTeamContext) {
      if (shouldShowOpeningIndicator) {
        store.openingRun = true;
        store.error = null;
      }

      try {
        selectionStore.selectRun(row.teamRunId, 'team');
        await teamContextsStore.focusMemberAndEnsureHydrated?.(row.teamRunId, row.memberRouteKey);
        store.selectedTeamRunId = row.teamRunId;
        store.selectedTeamMemberRouteKey = row.memberRouteKey;
        store.selectedRunId = null;
        useTeamRunConfigStore().clearConfig();
        useAgentRunConfigStore().clearConfig();
      } catch (error: any) {
        if (shouldShowOpeningIndicator) {
          store.error = error?.message || `Failed to open team '${row.teamRunId}'.`;
        }
        throw error;
      } finally {
        if (shouldShowOpeningIndicator) {
          store.openingRun = false;
        }
      }
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
