import { defineStore } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import {
  GetActiveAgentRunSnapshot,
  GetActiveAgentTeamRunSnapshot,
  GetActiveRuntimeSnapshot,
} from '~/graphql/queries/activeRuntimeQueries';
import { hydrateLiveRunContext } from '~/services/runHydration/runContextHydrationService';
import {
  applyLiveTeamStatusSnapshot,
  hydrateLiveTeamRunContext,
  type TeamMemberLiveSnapshot,
} from '~/services/runHydration/teamRunContextHydrationService';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import {
  normalizeAgentRuntimeStatus,
  normalizeTeamRuntimeStatus,
} from '~/services/runHydration/runtimeStatusNormalization';

export interface ActiveAgentRunSnapshot {
  id: string;
  name?: string | null;
  currentStatus: string;
}

export interface ActiveTeamRunSnapshot {
  id: string;
  name?: string | null;
  currentStatus: string;
  members?: TeamMemberLiveSnapshot[];
}

interface ActiveRuntimeSnapshotQueryData {
  agentRuns?: ActiveAgentRunSnapshot[];
  agentTeamRuns?: ActiveTeamRunSnapshot[];
}

interface ActiveAgentRunSnapshotQueryData {
  activeAgentRunSnapshot?: ActiveAgentRunSnapshot | null;
}

interface ActiveTeamRunSnapshotQueryData {
  activeAgentTeamRunSnapshot?: ActiveTeamRunSnapshot | null;
}

const toIdSet = (ids: Array<string | null | undefined>): Set<string> =>
  new Set(ids.map((value) => (value || '').trim()).filter(Boolean));

const syncAgentRuntimeState = async (
  activeRunSnapshots: Map<string, ActiveAgentRunSnapshot>,
): Promise<void> => {
  const runHistoryStore = useRunHistoryStore();
  const agentContextsStore = useAgentContextsStore();
  const agentRunStore = useAgentRunStore();

  for (const [runId, context] of agentContextsStore.runs.entries()) {
    if (runId.startsWith('temp-') || activeRunSnapshots.has(runId)) {
      continue;
    }

    if (context.isSubscribed) {
      agentRunStore.disconnectAgentStream(runId);
    }
    if (context.state.currentStatus !== AgentStatus.Error) {
      context.state.currentStatus = AgentStatus.ShutdownComplete;
    }
  }

  for (const [runId, snapshot] of activeRunSnapshots.entries()) {
    const existingContext = agentContextsStore.getRun(runId);
    if (existingContext) {
      existingContext.config.isLocked = true;
      existingContext.state.currentStatus = normalizeAgentRuntimeStatus(snapshot.currentStatus);
      if (!existingContext.isSubscribed) {
        agentRunStore.connectToAgentStream(runId);
      }
      continue;
    }

    try {
      await hydrateLiveRunContext({
        runId,
        fallbackAgentName: snapshot.name || runHistoryStore.findAgentNameByRunId(runId),
        ensureWorkspaceByRootPath: (rootPath: string) => runHistoryStore.ensureWorkspaceByRootPath(rootPath),
        currentStatus: snapshot.currentStatus,
      });
      agentRunStore.connectToAgentStream(runId);
    } catch (error) {
      console.warn(`[activeRuntimeSync] Failed to recover active run '${runId}'.`, error);
    }
  }
};

const syncTeamRuntimeState = async (
  activeTeamRunSnapshots: Map<string, ActiveTeamRunSnapshot>,
): Promise<void> => {
  const runHistoryStore = useRunHistoryStore();
  const teamContextsStore = useAgentTeamContextsStore();
  const agentTeamRunStore = useAgentTeamRunStore();

  for (const teamContext of teamContextsStore.allTeamRuns) {
    if (teamContext.teamRunId.startsWith('temp-') || activeTeamRunSnapshots.has(teamContext.teamRunId)) {
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

  for (const [teamRunId, snapshot] of activeTeamRunSnapshots.entries()) {
    const existingContext = teamContextsStore.getTeamContextById(teamRunId);
    if (existingContext) {
      existingContext.config.isLocked = true;
      existingContext.currentStatus = normalizeTeamRuntimeStatus(snapshot.currentStatus);
      existingContext.members.forEach((memberContext) => {
        memberContext.config.isLocked = true;
      });
      applyLiveTeamStatusSnapshot(existingContext, {
        currentStatus: snapshot.currentStatus,
        memberStatuses: snapshot.members || [],
      });
      if (!existingContext.isSubscribed) {
        agentTeamRunStore.connectToTeamStream(teamRunId);
      }
      continue;
    }

    try {
      await hydrateLiveTeamRunContext({
        teamRunId,
        memberRouteKey: null,
        ensureWorkspaceByRootPath: (rootPath: string) => runHistoryStore.ensureWorkspaceByRootPath(rootPath),
        currentStatus: snapshot.currentStatus,
        memberStatuses: snapshot.members || [],
      });
      agentTeamRunStore.connectToTeamStream(teamRunId);
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
    activeRunSnapshotsById: {} as Record<string, ActiveAgentRunSnapshot>,
    activeTeamRunSnapshotsById: {} as Record<string, ActiveTeamRunSnapshot>,
  }),

  getters: {
    getActiveRunSnapshot: (state) => (runId: string): ActiveAgentRunSnapshot | null =>
      state.activeRunSnapshotsById[runId] || null,

    getActiveTeamRunSnapshot: (state) => (teamRunId: string): ActiveTeamRunSnapshot | null =>
      state.activeTeamRunSnapshotsById[teamRunId] || null,
  },

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

        const activeRunSnapshots = new Map<string, ActiveAgentRunSnapshot>(
          (data?.agentRuns || []).map((run: ActiveAgentRunSnapshot) => [run.id, run] as const),
        );
        const activeTeamRunSnapshots = new Map<string, ActiveTeamRunSnapshot>(
          (data?.agentTeamRuns || []).map((teamRun: ActiveTeamRunSnapshot) => [teamRun.id, teamRun] as const),
        );
        const activeRunIds = toIdSet(Array.from(activeRunSnapshots.keys()));
        const activeTeamRunIds = toIdSet(Array.from(activeTeamRunSnapshots.keys()));

        this.activeRunSnapshotsById = Object.fromEntries(activeRunSnapshots.entries());
        this.activeTeamRunSnapshotsById = Object.fromEntries(activeTeamRunSnapshots.entries());

        const runHistoryStore = useRunHistoryStore();
        runHistoryStore.reconcileActiveRunIds(activeRunIds);
        runHistoryStore.reconcileActiveTeamRunIds(activeTeamRunIds);

        await syncAgentRuntimeState(activeRunSnapshots);
        await syncTeamRuntimeState(activeTeamRunSnapshots);

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

    async ensureActiveRunSnapshot(runId: string): Promise<ActiveAgentRunSnapshot | null> {
      const normalizedRunId = runId.trim();
      if (!normalizedRunId) {
        return null;
      }

      const existing = this.activeRunSnapshotsById[normalizedRunId];
      if (existing) {
        return existing;
      }

      const client = getApolloClient();
      const { data, errors } = await client.query<ActiveAgentRunSnapshotQueryData>({
        query: GetActiveAgentRunSnapshot,
        variables: { id: normalizedRunId },
        fetchPolicy: 'network-only',
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
      }

      const snapshot = data?.activeAgentRunSnapshot || null;
      if (snapshot) {
        this.activeRunSnapshotsById = {
          ...this.activeRunSnapshotsById,
          [normalizedRunId]: snapshot,
        };
      }
      return snapshot;
    },

    async ensureActiveTeamRunSnapshot(teamRunId: string): Promise<ActiveTeamRunSnapshot | null> {
      const normalizedTeamRunId = teamRunId.trim();
      if (!normalizedTeamRunId) {
        return null;
      }

      const existing = this.activeTeamRunSnapshotsById[normalizedTeamRunId];
      if (existing) {
        return existing;
      }

      const client = getApolloClient();
      const { data, errors } = await client.query<ActiveTeamRunSnapshotQueryData>({
        query: GetActiveAgentTeamRunSnapshot,
        variables: { id: normalizedTeamRunId },
        fetchPolicy: 'network-only',
      });

      if (errors && errors.length > 0) {
        throw new Error(errors.map((error: { message: string }) => error.message).join(', '));
      }

      const snapshot = data?.activeAgentTeamRunSnapshot || null;
      if (snapshot) {
        this.activeTeamRunSnapshotsById = {
          ...this.activeTeamRunSnapshotsById,
          [normalizedTeamRunId]: snapshot,
        };
      }
      return snapshot;
    },
  },
});
