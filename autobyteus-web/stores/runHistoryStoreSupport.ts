import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import type {
  RunHistoryWorkspaceGroup,
  TeamRunHistoryItem,
} from '~/stores/runHistoryTypes';

export const flattenWorkspaceTeamRuns = (
  groups: RunHistoryWorkspaceGroup[],
): TeamRunHistoryItem[] =>
  groups.flatMap((workspace) =>
    workspace.teamDefinitions.flatMap((teamDefinition) =>
      teamDefinition.runs.map((teamRun) => ({
        ...teamRun,
        workspaceRootPath: teamRun.workspaceRootPath ?? workspace.workspaceRootPath,
      })),
    ),
  );

export const removeRunFromWorkspaceGroups = (
  groups: RunHistoryWorkspaceGroup[],
  runId: string,
): RunHistoryWorkspaceGroup[] => {
  return groups
    .map((workspace) => ({
      ...workspace,
      agentDefinitions: workspace.agentDefinitions
        .map((agent) => ({
          ...agent,
          runs: agent.runs.filter((run) => run.runId !== runId),
        }))
        .filter((agent) => agent.runs.length > 0),
    }))
    .filter((workspace) => workspace.agentDefinitions.length > 0 || workspace.teamDefinitions.length > 0);
};

export const removeTeamRunFromWorkspaceGroups = (
  groups: RunHistoryWorkspaceGroup[],
  teamRunId: string,
): RunHistoryWorkspaceGroup[] =>
  groups
    .map((workspace) => ({
      ...workspace,
      teamDefinitions: workspace.teamDefinitions
        .map((teamDefinition) => ({
          ...teamDefinition,
          runs: teamDefinition.runs.filter((teamRun) => teamRun.teamRunId !== teamRunId),
        }))
        .filter((teamDefinition) => teamDefinition.runs.length > 0),
    }))
    .filter((workspace) => workspace.agentDefinitions.length > 0 || workspace.teamDefinitions.length > 0);

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
