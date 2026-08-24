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
  applyRunNavigationTeamFocusToProjection,
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

export const applyRunNavigationTeamFocusForStore = (
  store: RunHistoryNavigationStoreState,
  teamRunId: string,
  agentRunId: string,
): boolean => {
  const result = applyRunNavigationTeamFocusToProjection(
    ensureProjection(store), teamRunId, agentRunId,
  );
  if (!result.changed) return false;
  store.navigationProjection = result.state;
  store.navigationPatchRevision += 1;
  return true;
};

export const focusTeamMemberAndEnsureHydratedForStore = async (
  store: RunHistoryNavigationStoreState,
  teamRunId: string,
  agentRunId: string,
): Promise<boolean> => {
  const teamStore = useAgentTeamContextsStore();
  const context = teamStore.getTeamContextById(teamRunId);
  if (!context || context.view.getRootTeamRunId() !== teamRunId) return false;
  const result = context.view.focusAgent(agentRunId);
  if (result.disposition === 'rejected' || context.view.getFocusedAgentRunId() !== agentRunId) return false;
  return applyRunNavigationTeamFocusForStore(store, teamRunId, agentRunId);
};

export const standaloneNavigationTarget = (input: {
  runId: string;
  currentStatus: AgentStatus;
  summary?: string;
}): RunNavigationTarget => ({ kind: 'standalone', ...input });
