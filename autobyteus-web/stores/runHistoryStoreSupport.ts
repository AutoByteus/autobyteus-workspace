import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import type {
  RunHistoryWorkspaceGroup,
  AgentOrgRunHistoryItem,
  TeamRunHistoryItem,
} from '~/stores/runHistoryTypes';
import { parseAgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution';

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

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const stringField = (value: unknown, label: string): string => {
  if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
  return value;
};

const nullableStringField = (value: unknown, label: string): string | null => {
  if (value === null) return null;
  return stringField(value, label);
};

/** Strictly decodes only the AgentOrg branch. The Team union branch is
 * deliberately ignored because standalone Teams are sourced by the existing
 * workspace-history query and must not be duplicated. */
export const parseAgentOrgHistoryItems = (value: unknown): AgentOrgRunHistoryItem[] => {
  if (!Array.isArray(value)) throw new Error('Collaboration root history must be an array.');
  const result: AgentOrgRunHistoryItem[] = [];

  for (const [index, candidate] of value.entries()) {
    const item = record(candidate, `Collaboration history row ${index}`);
    const kind = stringField(item.root_subject_kind, `Collaboration history row ${index} root_subject_kind`);
    if (kind === 'agent_team') continue;
    if (kind !== 'agent_org') throw new Error(`Unsupported collaboration root kind '${kind}'.`);

    const rootRunId = stringField(item.root_run_id, `AgentOrg history row ${index} root_run_id`).trim();
    const createdAt = stringField(item.created_at, `AgentOrg history row ${index} created_at`);
    const archivedAt = nullableStringField(item.archived_at, `AgentOrg history row ${index} archived_at`);
    const summary = stringField(item.summary, `AgentOrg history row ${index} summary`);
    if (typeof item.is_active !== 'boolean') {
      throw new Error(`AgentOrg history row ${index} is_active must be a boolean.`);
    }
    if (!rootRunId) throw new Error(`AgentOrg history row ${index} has an empty root_run_id.`);

    const executionTree = parseAgentOrgExecutionTree(item.org);
    if (executionTree.rootOrg.orgRunId !== rootRunId) {
      throw new Error(`AgentOrg history row '${rootRunId}' does not match its execution tree root.`);
    }
    result.push(Object.freeze({
      stableKey: `agent_org_run:${rootRunId}`,
      rootSubjectKind: 'agent_org' as const,
      rootRunId,
      createdAt,
      archivedAt,
      isActive: item.is_active,
      summary,
      executionTree,
    }));
  }

  return result;
};
