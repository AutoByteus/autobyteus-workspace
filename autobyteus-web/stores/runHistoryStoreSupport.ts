import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import type {
  RunHistoryWorkspaceGroup,
} from '~/stores/runHistoryTypes';

export const removeRunFromWorkspaceGroups = (
  groups: RunHistoryWorkspaceGroup[],
  runId: string,
): RunHistoryWorkspaceGroup[] => {
  return groups
    .map((workspace) => ({
      ...workspace,
      teamRuns: workspace.teamRuns ?? [],
      agents: workspace.agents
        .map((agent) => ({
          ...agent,
          runs: agent.runs.filter((run) => run.runId !== runId),
        }))
        .filter((agent) => agent.runs.length > 0),
    }))
    .filter((workspace) => workspace.agents.length > 0 || workspace.teamRuns.length > 0);
};

export const removeTeamRunFromWorkspaceGroups = (
  groups: RunHistoryWorkspaceGroup[],
  teamRunId: string,
): RunHistoryWorkspaceGroup[] =>
  groups
    .map((workspace) => ({
      ...workspace,
      teamRuns: (workspace.teamRuns ?? []).filter((teamRun) => teamRun.teamRunId !== teamRunId),
    }))
    .filter((workspace) => workspace.agents.length > 0 || workspace.teamRuns.length > 0);

export const buildNextAgentAvatarIndex = async (
  currentIndex: Record<string, string>,
  options: { loadDefinitionsIfNeeded?: boolean } = {},
): Promise<Record<string, string>> => {
  const agentDefinitionStore = useAgentDefinitionStore();
  const agentContextsStore = useAgentContextsStore();
  const shouldLoadDefinitions = options.loadDefinitionsIfNeeded ?? false;

  if (shouldLoadDefinitions && agentDefinitionStore.agentDefinitions.length === 0) {
    try {
      await agentDefinitionStore.fetchAllAgentDefinitions();
    } catch {
      // Best-effort hydration only.
    }
  }

  const next: Record<string, string> = { ...currentIndex };

  for (const definition of agentDefinitionStore.agentDefinitions) {
    const avatarUrl = definition.avatarUrl?.trim();
    if (avatarUrl) {
      next[definition.id] = avatarUrl;
    }
  }

  for (const context of agentContextsStore.runs.values()) {
    const definitionId = context.config.agentDefinitionId;
    const avatarUrl = context.config.agentAvatarUrl?.trim();
    if (definitionId && avatarUrl) {
      next[definitionId] = avatarUrl;
    }
  }

  return next;
};
