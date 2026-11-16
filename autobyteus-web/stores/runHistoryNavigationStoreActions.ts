import { useWorkspaceStore } from '~/stores/workspace';
import { topLevelRunSources } from '~/stores/topLevelRunSources';
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
  // The same top-level runs as the phone's run tree (CR-461-053): no retired run, no delegated run opened from its view.
  const topLevel = topLevelRunSources(store.workspaceGroups);
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
