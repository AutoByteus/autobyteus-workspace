import { defineStore } from 'pinia';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { normalizeRootPath } from '~/stores/runHistoryReadModel';
import type { RunHistoryWorkspaceGroup } from '~/stores/runHistoryTypes';

/** Where a run was listed. Agent history lists only the newest runs per agent (`limitPerAgent`); team history lists all. */
type ListedRun = Readonly<{ kind: 'agent'; groupKey: string; createdAt: string }> | Readonly<{ kind: 'team' }>;
type AgentGroupWindow = Readonly<{ count: number; oldestCreatedAt: string }>;

const agentGroupKey = (workspaceRootPath: string, agentDefinitionId: string): string =>
  `${normalizeRootPath(workspaceRootPath)}\u0000${agentDefinitionId}`;

const readListing = (groups: readonly RunHistoryWorkspaceGroup[]) => {
  const runs = new Map<string, ListedRun>();
  const windows = new Map<string, AgentGroupWindow>();
  for (const workspace of groups) {
    for (const agent of workspace.agentDefinitions) {
      const groupKey = agentGroupKey(workspace.workspaceRootPath, agent.agentDefinitionId);
      let oldestCreatedAt = '';
      for (const run of agent.runs) {
        runs.set(run.runId, { kind: 'agent', groupKey, createdAt: run.createdAt });
        if (!oldestCreatedAt || run.createdAt.localeCompare(oldestCreatedAt) < 0) oldestCreatedAt = run.createdAt;
      }
      windows.set(groupKey, { count: agent.runs.length, oldestCreatedAt });
    }
    for (const team of workspace.teamDefinitions) {
      for (const run of team.runs) runs.set(run.teamRunId, { kind: 'team' });
    }
  }
  return { runs, windows };
};

/**
 * A run absent from a read has left the history only if the read would have listed it: every team run is listed, but
 * an agent run is listed only while it is among the newest `limitPerAgent` runs of its agent (it may just have fallen
 * out of that window).
 */
const leftHistory = (run: ListedRun, windows: ReadonlyMap<string, AgentGroupWindow>, limitPerAgent: number): boolean => {
  if (run.kind === 'team') return true;
  const window = windows.get(run.groupKey);
  return !window || window.count < Math.max(limitPerAgent, 1) || run.createdAt.localeCompare(window.oldestCreatedAt) > 0;
};

/**
 * Top-level run rows the sidebar no longer shows although this session still holds their contexts: a run a history
 * read listed is retired when a later read no longer lists it (and would have), e.g. deleted or archived from another
 * window or client, and shown again if a read lists it again. Runs no read has listed yet (drafts, runs created this
 * session) are never retired by this.
 */
export const useRunHistoryRetiredRunsStore = defineStore('runHistoryRetiredRuns', {
  state: () => ({
    departedRunIds: {} as Record<string, true>,
    /** Every run a read has listed and that has not left the history since. */
    listedRuns: {} as Record<string, ListedRun>,
  }),
  getters: {
    retiredRunIds: (state): ReadonlySet<string> => new Set(Object.keys(state.departedRunIds)),
  },
  actions: {
    reconcileHistoryRead(groups: readonly RunHistoryWorkspaceGroup[], limitPerAgent: number): void {
      const { runs, windows } = readListing(groups);
      const departed = { ...this.departedRunIds };
      const listed: Record<string, ListedRun> = {};
      for (const [runId, run] of Object.entries(this.listedRuns)) {
        if (runs.has(runId)) continue;
        if (leftHistory(run, windows, limitPerAgent)) departed[runId] = true;
        else listed[runId] = run;
      }
      for (const [runId, run] of runs) {
        listed[runId] = run;
        delete departed[runId];
      }
      this.listedRuns = listed;
      this.departedRunIds = departed;
    },
  },
});

export type RunHistoryTopLevelSources = Readonly<{
  workspaceGroups: RunHistoryWorkspaceGroup[];
  agentContexts: Map<string, AgentContext>;
  teamContexts: AgentTeamContext[];
}>;

/** The history rows and contexts the sidebar builds its top-level rows from, without the retired runs. */
export const withoutRetiredRuns = (
  sources: RunHistoryTopLevelSources,
  retired: ReadonlySet<string>,
): RunHistoryTopLevelSources => {
  if (retired.size === 0) return sources;
  // A group left empty by the filter goes too (a read never lists an empty group).
  const withoutRetired = <G extends { runs: unknown[] }>(groups: G[], idOf: (run: G['runs'][number]) => string): G[] => groups.flatMap((group) => {
    const runs = group.runs.filter((run) => !retired.has(idOf(run)));
    if (runs.length === group.runs.length) return [group];
    return runs.length > 0 ? [{ ...group, runs }] : [];
  });
  return {
    workspaceGroups: sources.workspaceGroups.map((workspace) => ({
      ...workspace,
      agentDefinitions: withoutRetired(workspace.agentDefinitions, (run) => run.runId),
      teamDefinitions: withoutRetired(workspace.teamDefinitions, (run) => run.teamRunId),
    })),
    agentContexts: new Map([...sources.agentContexts].filter(([runId]) => !retired.has(runId))),
    teamContexts: sources.teamContexts.filter((context) => !retired.has(context.view.getRootTeamRunId())),
  };
};
