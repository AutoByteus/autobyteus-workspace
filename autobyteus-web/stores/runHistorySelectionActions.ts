import type {
  TeamMemberFocusTarget,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { createTeamExecutionAddress, serializeTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

type RunHistorySelectionMode = 'desktop' | 'mobile';

interface RunHistoryOpenOptions {
  selectionMode?: RunHistorySelectionMode;
}

interface RunHistorySelectionStoreLike {
  openingRun: boolean;
  error: string | null;
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  selectedTeamMemberAddress: string | null;
  teamResumeConfigByTeamRunId: Record<string, TeamRunResumeConfigPayload>;
  openTeamMemberRun(teamRunId: string, memberAddress: string, options?: RunHistoryOpenOptions): Promise<void>;
  openRun(runId: string, options?: RunHistoryOpenOptions): Promise<void>;
  ensureWorkspaceByRootPath(rootPath: string): Promise<string | null>;
  resolveWorkspaceMetadataByRootPath(rootPath: string): Promise<WorkspaceMetadata | null>;
}

export const openTeamMemberRunFromHistory = async (
  store: RunHistorySelectionStoreLike,
  teamRunId: string,
  memberAddress: string,
  options: RunHistoryOpenOptions = {},
): Promise<void> => {
  store.openingRun = true;
  store.error = null;
  try {
    const result = await openTeamRun({
      teamRunId,
      memberAddress,
      resolveWorkspaceMetadataByRootPath: (path: string) =>
        store.resolveWorkspaceMetadataByRootPath(path),
      ensureWorkspaceByRootPath: (path: string) => store.ensureWorkspaceByRootPath(path),
      selectionMode: options.selectionMode,
    });

    store.teamResumeConfigByTeamRunId[result.resumeConfig.teamRunId] = result.resumeConfig;
    store.selectedTeamRunId = result.teamRunId;
    store.selectedTeamMemberAddress = result.focusedExecutionAddress.memberAddress;
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
  row: RunTreeRow | TeamMemberFocusTarget,
): Promise<void> => {
  if ('teamRunId' in row) {
    const teamContextsStore = useAgentTeamContextsStore();
    const selectionStore = useAgentSelectionStore();
    const localTeamContext = teamContextsStore.getTeamContextById(row.teamRunId);
    const executionAddress = row.executionAddress ?? createTeamExecutionAddress({
      rootTeamRunId: row.teamRunId,
      memberAddress: row.memberAddress,
    });
    const memberNodesByAddress = localTeamContext?.memberNodesByAddress ?? null;
    const shouldReuseLocalTeamContext = Boolean(
      localTeamContext && (
        memberNodesByAddress?.has(row.memberAddress)
        || localTeamContext.agentExecutionsByKey.has(serializeTeamExecutionAddress(executionAddress))
      ),
    );
    const localTargetMemberAddress = row.memberAddress;
    const localMemberProjectionLoadState =
      localTeamContext?.historicalHydration?.memberProjectionLoadStateByAddress[localTargetMemberAddress]
      ?? null;
    const memberNode = memberNodesByAddress?.get(localTargetMemberAddress);
    const isLeafAgent = memberNode?.kind === 'agent';
    const shouldShowOpeningIndicator = Boolean(localTeamContext?.historicalHydration && isLeafAgent)
      && localMemberProjectionLoadState !== 'loaded';

    if (shouldReuseLocalTeamContext) {
      if (shouldShowOpeningIndicator) {
        store.openingRun = true;
        store.error = null;
      }

      try {
        selectionStore.selectRun(row.teamRunId, 'team');
        if (executionAddress.taskTeamRunIds.length > 0 || executionAddress.taskAgentRunId) {
          teamContextsStore.setFocusedExecutionAddress(executionAddress);
        } else {
          await teamContextsStore.focusMemberAndEnsureHydrated?.(row.teamRunId, localTargetMemberAddress);
        }
        store.selectedTeamRunId = row.teamRunId;
        store.selectedTeamMemberAddress = localTargetMemberAddress;
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
    await store.openTeamMemberRun(row.teamRunId, row.memberAddress);
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
  store.selectedTeamMemberAddress = null;
  useTeamRunConfigStore().clearConfig();
  useAgentRunConfigStore().clearConfig();
};
