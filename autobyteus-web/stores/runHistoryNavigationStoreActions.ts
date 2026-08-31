import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunHistoryWorkspaceGroup } from './runHistoryTypes';
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
}

export const refreshRunNavigationTopologyForStore = (
  store: RunHistoryNavigationStoreState,
  _reason: string,
): void => {
  const workspaceStore = useWorkspaceStore();
  store.navigationProjection = buildRunHistoryNavigationProjection({
    workspaceGroups: store.workspaceGroups,
    agentAvatarByDefinitionId: store.agentAvatarByDefinitionId,
    allWorkspaces: workspaceStore.allWorkspaces,
    workspacesById: workspaceStore.workspaces,
    agentContexts: useAgentContextsStore().runs,
    teamContexts: useAgentTeamContextsStore().allTeamRuns ?? [],
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
