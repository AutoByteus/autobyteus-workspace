import { watch } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useTeamStreamRecoveryStore } from '~/stores/teamStreamRecoveryStore';
import { ensureRunHistoryWorkspaceByRootPath, resolveRunHistoryWorkspaceMetadataByRootPath } from '~/stores/runHistoryLoadActions';
import { LiveStreamReconnectScheduler } from '~/services/liveStreamLifecycle/liveStreamReconnectScheduler';
import { reopenTeamRunAfterStreamLoss } from './teamRunOpenCoordinator';

export interface TeamStreamAutoRecovery { dispose(): void }

/**
 * A Team stream that failed recovers by itself (autobyteus-541 D-A2), as an Org's does: for each Team whose recovery
 * the store publishes, one recovery on the reconnect cadence every stream uses. Each attempt is the verified replacement
 * a reselect runs (`reopenTeamRunAfterStreamLoss`, shared with it); the fifth failure in a row shows the notice
 * (`exhausted`) and the attempts go on. A recovery ends with its commit, or without counting a failure once the Team's
 * context is gone or its current stream no longer needs one. A stopped Team's open view keeps its stream (SR-045), so it
 * is recovered too.
 */
export const startTeamStreamAutoRecovery = (): TeamStreamAutoRecovery => {
  const recoveryStates = useTeamStreamRecoveryStore();
  const releaseOwner = recoveryStates.registerOwner();
  const recoveries = new Map<string, LiveStreamReconnectScheduler>();

  const stillNeeded = (teamRunId: string): boolean =>
    Boolean(useAgentTeamContextsStore().getTeamContextById(teamRunId))
    && useAgentTeamRunStore().isTeamStreamReopenRequired(teamRunId);

  const end = (teamRunId: string): void => {
    recoveries.get(teamRunId)?.dispose();
    recoveries.delete(teamRunId);
  };

  const attempt = async (teamRunId: string, scheduler: LiveStreamReconnectScheduler): Promise<void> => {
    if (!stillNeeded(teamRunId)) { end(teamRunId); return; }
    try {
      await reopenTeamRunAfterStreamLoss({
        teamRunId,
        selectRun: false,
        resolveWorkspaceMetadataByRootPath: resolveRunHistoryWorkspaceMetadataByRootPath,
        ensureWorkspaceByRootPath: ensureRunHistoryWorkspaceByRootPath,
      });
      if (recoveries.get(teamRunId) === scheduler) end(teamRunId);
    } catch (error) {
      if (recoveries.get(teamRunId) !== scheduler) return;
      if (!stillNeeded(teamRunId)) { end(teamRunId); return; }
      console.warn(`Team stream recovery of '${teamRunId}' failed; it tries again.`, error);
      scheduler.connectionLost();
    }
  };

  const begin = (teamRunId: string): void => {
    const scheduler: LiveStreamReconnectScheduler = new LiveStreamReconnectScheduler({
      attempt: () => { void attempt(teamRunId, scheduler); },
      // No stream of its own to re-synchronize: its success ends it.
      resynchronize: () => undefined,
      onPersistentFailure: () => recoveryStates.setProgress(teamRunId, 'exhausted'),
    });
    recoveries.set(teamRunId, scheduler);
    recoveryStates.setProgress(teamRunId, 'recovering');
    scheduler.attemptNow();
  };

  const stopWatching = watch(() => recoveryStates.states, (states) => {
    for (const [teamRunId, state] of Object.entries(states)) {
      if (state === 'required' && !recoveries.has(teamRunId)) begin(teamRunId);
    }
    // Committed or closed: the store cleared it.
    for (const teamRunId of [...recoveries.keys()]) if (!(teamRunId in states)) end(teamRunId);
  }, { immediate: true });

  return {
    dispose: () => {
      stopWatching();
      for (const teamRunId of [...recoveries.keys()]) end(teamRunId);
      releaseOwner();
    },
  };
};
