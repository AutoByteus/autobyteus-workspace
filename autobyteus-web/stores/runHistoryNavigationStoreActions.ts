import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useDelegatedRunsStore } from '~/stores/delegatedRunsStore';
import { flattenWorkspaceTeamRuns } from '~/stores/runHistoryStoreSupport';
import { useRunHistoryRetiredRunsStore, withoutRetiredRuns } from '~/stores/runHistoryRetiredRuns';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentOrgRunHistoryItem, RunHistoryWorkspaceGroup } from './runHistoryTypes';
import type { RunNavigationEffect } from '~/services/agentStreaming/agentStreamMutationEffects';
import {
  buildRunHistoryNavigationProjection,
  type RunHistoryNavigationProjectionState,
} from './runHistoryNavigationProjection';
import {
  applyRunNavigationEffectToProjection,
  type RunNavigationTarget,
} from './runHistoryNavigationPatches';

export interface RunHistoryNavigationStoreState {
  workspaceGroups: RunHistoryWorkspaceGroup[];
  agentAvatarByDefinitionId: Record<string, string>;
  navigationProjection: RunHistoryNavigationProjectionState | null;
  navigationTopologyRevision: number;
  navigationPatchRevision: number;
  agentOrgHistory: AgentOrgRunHistoryItem[];
}

export const refreshRunNavigationTopologyForStore = (
  store: RunHistoryNavigationStoreState,
  _reason: string,
): void => {
  const workspaceStore = useWorkspaceStore();
  // A delegated run opened from its delegator's view is listed under that view, not as a top-level run of its own
  // (DS-11, CR-461-044): its open context joins the list only when the list itself has the run.
  const delegated = useDelegatedRunsStore();
  const listedAgentRuns = new Set(store.workspaceGroups.flatMap((workspace) => workspace.agentDefinitions.flatMap((agent) => agent.runs.map((run) => run.runId))));
  const listedTeamRuns = new Set(flattenWorkspaceTeamRuns(store.workspaceGroups).map((team) => team.teamRunId));
  const topLevel = withoutRetiredRuns({
    workspaceGroups: store.workspaceGroups,
    agentContexts: new Map([...useAgentContextsStore().runs].filter(([runId]) => listedAgentRuns.has(runId) || !delegated.ownsAgentRun(runId))),
    teamContexts: (useAgentTeamContextsStore().allTeamRuns ?? []).filter((team) => {
      const teamRunId = team.view.getRootTeamRunId();
      return listedTeamRuns.has(teamRunId) || !delegated.ownsTeamRun(teamRunId);
    }),
  }, useRunHistoryRetiredRunsStore().retiredRunIds);
  store.navigationProjection = buildRunHistoryNavigationProjection({
    ...topLevel,
    agentAvatarByDefinitionId: store.agentAvatarByDefinitionId,
    allWorkspaces: workspaceStore.allWorkspaces,
    workspacesById: workspaceStore.workspaces,
    agentOrgHistory: store.agentOrgHistory,
  }, store.navigationProjection);
  store.navigationTopologyRevision += 1;
};

const ensureProjection = (store: RunHistoryNavigationStoreState): RunHistoryNavigationProjectionState => {
  if (!store.navigationProjection) refreshRunNavigationTopologyForStore(store, 'lazy-seed');
  return store.navigationProjection!;
};

export const applyRunNavigationEffectForStore = (
  store: RunHistoryNavigationStoreState,
  target: RunNavigationTarget,
  effect: RunNavigationEffect,
): boolean => {
  const result = applyRunNavigationEffectToProjection(ensureProjection(store), target, effect);
  if (result.rebuild) {
    refreshRunNavigationTopologyForStore(store, 'run-outside-listed-folders');
    return true;
  }
  if (!result.changed) return false;
  store.navigationProjection = result.state;
  store.navigationPatchRevision += 1;
  return true;
};

export const standaloneNavigationTarget = (input: {
  runId: string;
  currentStatus: AgentStatus;
  summary?: string;
}): RunNavigationTarget => ({ kind: 'standalone', ...input });
