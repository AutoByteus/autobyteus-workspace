import { watch } from 'vue';
import type {
  TeamMemberFocusTarget,
  TeamRunResumeConfigPayload,
} from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { useAgentSelectionStore, type WorkspaceSelectionIntent, type WorkspaceSelectionOutcome } from '~/stores/agentSelectionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { openTeamRun, reopenTeamRunAfterStreamLoss } from '~/services/runOpen/teamRunOpenCoordinator';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import type { TeamMemberInspectionResult } from '~/services/runOpen/teamMemberInspectionCoordinator';
import {
  clearTeamMemberInspectionAttempt,
  teamMemberInspectionIdentity,
  setTeamMemberInspectionError,
  setTeamMemberInspectionLoading,
  type TeamMemberInspectionAttemptStoreState,
} from './runHistoryTeamMemberInspectionActions';

type RunHistorySelectionMode = 'desktop' | 'mobile';

export interface RunHistoryOpenOptions {
  selectionIntent?: WorkspaceSelectionIntent;
  selectionMode?: RunHistorySelectionMode;
}

interface RunHistorySelectionStoreLike extends TeamMemberInspectionAttemptStoreState {
  openingRun: boolean;
  error: string | null;
  selectedRunId: string | null;
  selectedTeamRunId: string | null;
  selectedTeamMemberAddress: string | null;
  teamResumeConfigByTeamRunId: Record<string, TeamRunResumeConfigPayload>;
  openTeamMemberRun(teamRunId: string, agentRunId: string, options?: RunHistoryOpenOptions): Promise<WorkspaceSelectionOutcome>;
  openRun(runId: string, options?: RunHistoryOpenOptions): Promise<WorkspaceSelectionOutcome>;
  ensureWorkspaceByRootPath(rootPath: string): Promise<string | null>;
  resolveWorkspaceMetadataByRootPath(rootPath: string): Promise<WorkspaceMetadata | null>;
  inspectTeamMember(
    teamRunId: string,
    agentRunId: string,
    options?: RunHistoryOpenOptions,
  ): Promise<TeamMemberInspectionResult>;
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
): Promise<WorkspaceSelectionOutcome> => {
  const intent = options.selectionIntent ?? useAgentSelectionStore().beginSelectionIntent();
  if (!intent.isCurrent()) return { disposition: 'superseded' };
  store.openingRun = true;
  store.error = null;
  const attempt = setTeamMemberInspectionLoading(store, teamRunId, agentRunId);
  const key = teamMemberInspectionIdentity(teamRunId, agentRunId);
  const clearOwned = () => {
    if (store.teamMemberInspectionByIdentity[key] === attempt) clearTeamMemberInspectionAttempt(store, teamRunId, agentRunId);
  };
  // Invalidate the old loading state synchronously, before the next intent starts loading.
  const stopWatching = watch(intent.isCurrent, (current) => {
    if (!current) { store.openingRun = false; clearOwned(); }
  }, { flush: 'sync' });
  try {
    const open = useAgentTeamRunStore().isTeamStreamReopenRequired(teamRunId)
      ? reopenTeamRunAfterStreamLoss : openTeamRun;
    return await open({
      teamRunId,
      agentRunId,
      selectionIntent: intent,
      resolveWorkspaceMetadataByRootPath: (path) => store.resolveWorkspaceMetadataByRootPath(path),
      ensureWorkspaceByRootPath: (path) => store.ensureWorkspaceByRootPath(path),
      selectionMode: options.selectionMode,
      onCommitted: (committed) => {
        store.teamResumeConfigByTeamRunId[committed.resumeConfig.teamRunId] = committed.resumeConfig;
        store.selectedTeamRunId = committed.teamRunId;
        store.selectedTeamMemberAddress = committed.focusedMemberAddress;
        store.selectedRunId = null;
        clearOwned();
      },
    });
  } catch (error) {
    if (!intent.isCurrent()) return { disposition: 'superseded' };
    if (store.teamMemberInspectionByIdentity[key] === attempt) {
      setTeamMemberInspectionError(store, teamRunId, agentRunId,
        error instanceof Error ? error.message : `Failed to open team '${teamRunId}'.`);
    }
    throw error;
  } finally {
    stopWatching();
    if (intent.isCurrent()) store.openingRun = false;
    if (!intent.isCurrent()) clearOwned();
  }
};

export const selectTreeRunFromHistory = async (
  store: RunHistorySelectionStoreLike,
  row: RunTreeRow | TeamMemberFocusTarget,
  options: RunHistoryOpenOptions = {},
): Promise<WorkspaceSelectionOutcome> => {
  const intent = options.selectionIntent ?? useAgentSelectionStore().beginSelectionIntent();
  if (!intent.isCurrent()) return { disposition: 'superseded' };
  const selectingOptions = { ...options, selectionIntent: intent };
  if ('teamRunId' in row) {
    const mounted = useAgentTeamContextsStore().getTeamContextById(row.teamRunId);
    if (mounted && !useAgentTeamRunStore().isTeamStreamReopenRequired(row.teamRunId)) {
      const result = await store.inspectTeamMember(row.teamRunId, row.agentRunId, selectingOptions);
      if (result.disposition === 'rejected') throw new Error(result.message);
      return result;
    }
    return store.openTeamMemberRun(row.teamRunId, row.agentRunId, selectingOptions);
  }
  if (row.source === 'history') return store.openRun(row.runId, selectingOptions);

  if (!useAgentContextsStore().getRun(row.runId)) throw new Error(`Run '${row.runId}' is unavailable.`);
  useAgentSelectionStore().selectRun(row.runId, 'agent');
  store.selectedRunId = row.runId;
  store.selectedTeamRunId = null;
  store.selectedTeamMemberAddress = null;
  useTeamRunConfigStore().clearConfig();
  useAgentRunConfigStore().clearConfig();
  return { disposition: 'committed' };
};
