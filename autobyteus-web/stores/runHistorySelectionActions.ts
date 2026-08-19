import type {
  TeamMemberFocusTarget,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { openTeamRun, reopenTeamRunAfterStreamLoss } from '~/services/runOpen/teamRunOpenCoordinator';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';

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
  openTeamMemberRun(teamRunId: string, agentRunId: string, options?: RunHistoryOpenOptions): Promise<void>;
  openRun(runId: string, options?: RunHistoryOpenOptions): Promise<void>;
  ensureWorkspaceByRootPath(rootPath: string): Promise<string | null>;
  resolveWorkspaceMetadataByRootPath(rootPath: string): Promise<WorkspaceMetadata | null>;
  focusTeamMemberAndEnsureHydrated(teamRunId: string, agentRunId: string): Promise<boolean>;
}

export type TeamStreamRecoverySelectionFeedback = 'wait' | 'retry';

export const getTeamStreamRecoverySelectionFeedback = (
  error: unknown,
): TeamStreamRecoverySelectionFeedback | null => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('TEAM_STREAM_RECOVERY_WAIT:')) return 'wait';
  if (message.startsWith('TEAM_STREAM_RECOVERY_CHECKPOINT_CHANGED:')
    || message.startsWith('TEAM_STREAM_SNAPSHOT_BASE_MISMATCH:')) return 'retry';
  return null;
};

export const openTeamMemberRunFromHistory = async (
  store: RunHistorySelectionStoreLike,
  teamRunId: string,
  agentRunId: string,
  options: RunHistoryOpenOptions = {},
): Promise<void> => {
  store.openingRun = true;
  store.error = null;
  try {
    const result = await openTeamRun({
      teamRunId,
      agentRunId,
      resolveWorkspaceMetadataByRootPath: (path: string) =>
        store.resolveWorkspaceMetadataByRootPath(path),
      ensureWorkspaceByRootPath: (path: string) => store.ensureWorkspaceByRootPath(path),
      selectionMode: options.selectionMode,
    });

    store.teamResumeConfigByTeamRunId[result.resumeConfig.teamRunId] = result.resumeConfig;
    store.selectedTeamRunId = result.teamRunId;
    store.selectedTeamMemberAddress = result.focusedMemberAddress;
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
    const shouldReuseLocalTeamContext = Boolean(localTeamContext?.view.hasAgentRun(row.agentRunId));
    const localTargetMemberAddress = row.memberAddress;

    if (shouldReuseLocalTeamContext) {
      const teamRunStore = useAgentTeamRunStore();
      if (teamRunStore.isTeamStreamReopenRequired(row.teamRunId)) {
        store.openingRun = true;
        store.error = null;
        try {
          const result = await reopenTeamRunAfterStreamLoss({
            teamRunId: row.teamRunId,
            agentRunId: row.agentRunId,
            resolveWorkspaceMetadataByRootPath: (path: string) =>
              store.resolveWorkspaceMetadataByRootPath(path),
            ensureWorkspaceByRootPath: (path: string) => store.ensureWorkspaceByRootPath(path),
          });
          store.teamResumeConfigByTeamRunId[result.resumeConfig.teamRunId] = result.resumeConfig;
          store.selectedTeamRunId = result.teamRunId;
          store.selectedTeamMemberAddress = result.focusedMemberAddress;
          store.selectedRunId = null;
        } catch (error: any) {
          if (!getTeamStreamRecoverySelectionFeedback(error)) {
            store.error = error?.message || `Failed to recover team '${row.teamRunId}'.`;
          }
          throw error;
        } finally {
          store.openingRun = false;
        }
        return;
      }
      try {
        selectionStore.selectRun(row.teamRunId, 'team');
        await store.focusTeamMemberAndEnsureHydrated(row.teamRunId, row.agentRunId);
        store.selectedTeamRunId = row.teamRunId;
        store.selectedTeamMemberAddress = localTargetMemberAddress;
        store.selectedRunId = null;
        useTeamRunConfigStore().clearConfig();
        useAgentRunConfigStore().clearConfig();
      } catch (error: any) {
        store.error = error?.message || `Failed to open team '${row.teamRunId}'.`;
        throw error;
      }
      return;
    }
    await store.openTeamMemberRun(row.teamRunId, row.agentRunId);
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
