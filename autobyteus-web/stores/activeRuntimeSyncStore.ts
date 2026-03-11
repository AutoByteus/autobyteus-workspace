import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { GetActiveRuntimeSnapshot } from '~/graphql/queries/activeRuntimeQueries';
import { openRunWithCoordinator } from '~/services/runOpen/runOpenCoordinator';
import { openTeamRunWithCoordinator } from '~/services/runOpen/teamRunOpenCoordinator';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

interface ActiveRuntimeSnapshotQueryData {
  agentRuns?: Array<{
    id: string;
    currentStatus: string;
  }>;
  agentTeamRuns?: Array<{
    id: string;
    currentStatus: string;
  }>;
}

const toIdSet = (ids: Array<string | null | undefined>): Set<string> =>
  new Set(ids.map((value) => (value || '').trim()).filter(Boolean));

const syncAgentRuntimeState = async (activeRunIds: Set<string>): Promise<void> => {
  const runHistoryStore = useRunHistoryStore();
  const agentContextsStore = useAgentContextsStore();
  const agentRunStore = useAgentRunStore();

  for (const [runId, context] of agentContextsStore.runs.entries()) {
    if (runId.startsWith('temp-') || activeRunIds.has(runId)) {
      continue;
    }

    if (context.isSubscribed) {
      agentRunStore.disconnectAgentStream(runId);
    }
    if (context.state.currentStatus !== AgentStatus.Error) {
      context.state.currentStatus = AgentStatus.ShutdownComplete;
    }
  }

  for (const runId of activeRunIds) {
    const existingContext = agentContextsStore.getRun(runId);
    if (existingContext) {
      existingContext.config.isLocked = true;
      if (existingContext.state.currentStatus === AgentStatus.ShutdownComplete) {
        existingContext.state.currentStatus = AgentStatus.Uninitialized;
      }
      if (!existingContext.isSubscribed) {
        agentRunStore.connectToAgentStream(runId);
      }
      continue;
    }

    try {
      await openRunWithCoordinator({
        runId,
        fallbackAgentName: runHistoryStore.findAgentNameByRunId(runId),
        ensureWorkspaceByRootPath: (rootPath: string) => runHistoryStore.ensureWorkspaceByRootPath(rootPath),
        selectRun: false,
      });
    } catch (error) {
      console.warn(`[activeRuntimeSync] Failed to recover active run '${runId}'.`, error);
    }
  }
};

const syncTeamRuntimeState = async (activeTeamRunIds: Set<string>): Promise<void> => {
  const runHistoryStore = useRunHistoryStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const agentTeamRunStore = useAgentTeamRunStore();

  for (const teamContext of teamContextsStore.allTeamRuns) {
    if (teamContext.teamRunId.startsWith('temp-') || activeTeamRunIds.has(teamContext.teamRunId)) {
      continue;
    }

    if (teamContext.isSubscribed) {
      agentTeamRunStore.disconnectTeamStream(teamContext.teamRunId);
    }
    if (teamContext.currentStatus !== AgentTeamStatus.Error) {
      teamContext.currentStatus = AgentTeamStatus.ShutdownComplete;
    }
    teamContext.members.forEach((memberContext) => {
      if (memberContext.state.currentStatus !== AgentStatus.Error) {
        memberContext.state.currentStatus = AgentStatus.ShutdownComplete;
      }
    });
  }

  for (const teamRunId of activeTeamRunIds) {
    const existingContext = teamContextsStore.getTeamContextById(teamRunId);
    if (existingContext) {
      existingContext.config.isLocked = true;
      if (existingContext.currentStatus === AgentTeamStatus.ShutdownComplete) {
        existingContext.currentStatus = AgentTeamStatus.Uninitialized;
      }
      existingContext.members.forEach((memberContext) => {
        memberContext.config.isLocked = true;
        if (memberContext.state.currentStatus === AgentStatus.ShutdownComplete) {
          memberContext.state.currentStatus = AgentStatus.Uninitialized;
        }
      });
      if (!existingContext.isSubscribed) {
        agentTeamRunStore.connectToTeamStream(teamRunId);
      }
      continue;
    }

    try {
      await openTeamRunWithCoordinator({
        teamRunId,
        memberRouteKey: null,
        ensureWorkspaceByRootPath: (rootPath: string) => runHistoryStore.ensureWorkspaceByRootPath(rootPath),
        selectRun: false,
      });
    } catch (error) {
      console.warn(`[activeRuntimeSync] Failed to recover active team run '${teamRunId}'.`, error);
    }
  }
};

export const useActiveRuntimeSyncStore = defineStore('activeRuntimeSync', {
  state: () => ({
    loading: false,
    error: null as string | null,
    lastSyncedAt: null as string | null,
  }),

  actions: {
    async refresh(options: { quiet?: boolean } = {}): Promise<void> {
      const quiet = options.quiet === true;
      if (!quiet) {
        this.loading = true;
        this.error = null;
      }

      try {
        const windowNodeContextStore = useWindowNodeContextStore();
        const isReady = await windowNodeContextStore.waitForBoundBackendReady();
        if (!isReady) {
          throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready');
        }

        const client = getApolloClient();
        const { data, errors } = await client.query<ActiveRuntimeSnapshotQueryData>({
          query: GetActiveRuntimeSnapshot,
          fetchPolicy: 'network-only',
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
        }

        const activeRunIds = toIdSet(
          (data?.agentRuns || []).map((run: NonNullable<ActiveRuntimeSnapshotQueryData['agentRuns']>[number]) => run.id),
        );
        const activeTeamRunIds = toIdSet(
          (data?.agentTeamRuns || []).map(
            (teamRun: NonNullable<ActiveRuntimeSnapshotQueryData['agentTeamRuns']>[number]) => teamRun.id,
          ),
        );

        const runHistoryStore = useRunHistoryStore();
        runHistoryStore.reconcileActiveRunIds(activeRunIds);
        runHistoryStore.reconcileActiveTeamRunIds(activeTeamRunIds);

        await syncAgentRuntimeState(activeRunIds);
        await syncTeamRuntimeState(activeTeamRunIds);

        this.lastSyncedAt = new Date().toISOString();
      } catch (error: any) {
        if (!quiet) {
          this.error = error?.message || 'Failed to synchronize active runtime state.';
        }
      } finally {
        if (!quiet) {
          this.loading = false;
        }
      }
    },

    async refreshQuietly(): Promise<void> {
      await this.refresh({ quiet: true });
    },
  },
});
