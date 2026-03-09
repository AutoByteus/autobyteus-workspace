import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import type {
  RunHistoryWorkspaceGroup,
  TeamRunHistoryItem,
} from '~/stores/runHistoryTypes';

export const removeRunFromWorkspaceGroups = (
  groups: RunHistoryWorkspaceGroup[],
  runId: string,
): RunHistoryWorkspaceGroup[] => {
  return groups
    .map((workspace) => ({
      ...workspace,
      agents: workspace.agents
        .map((agent) => ({
          ...agent,
          runs: agent.runs.filter((run) => run.runId !== runId),
        }))
        .filter((agent) => agent.runs.length > 0),
    }))
    .filter((workspace) => workspace.agents.length > 0);
};

export const removeTeamRunById = (
  rows: TeamRunHistoryItem[],
  teamRunId: string,
): TeamRunHistoryItem[] => rows.filter((row) => row.teamRunId !== teamRunId);

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
