import { NodeType as TeamNodeType } from '../../agent-team-definition/domain/enums.js';

export interface NodeSyncSelectionSpec {
  agentDefinitionIds?: string[] | null;
  agentTeamDefinitionIds?: string[] | null;
  includeDependencies?: boolean | null;
  includeDeletes?: boolean | null;
}

export type NodeSyncSelectionErrorCode =
  | 'selection-empty'
  | 'invalid-selection-agent-id'
  | 'invalid-selection-team-id'
  | 'team-member-missing'
  | 'nested-team-missing'
  | 'agent-prompt-missing';

export class NodeSyncSelectionValidationError extends Error {
  readonly code: NodeSyncSelectionErrorCode;

  constructor(code: NodeSyncSelectionErrorCode, message: string) {
    super(message);
    this.name = 'NodeSyncSelectionValidationError';
    this.code = code;
  }
}

type AgentDefinitionSnapshot = {
  id?: string | null;
  name: string;
  systemPromptCategory?: string | null;
  systemPromptName?: string | null;
};

type TeamNodeSnapshot = {
  memberName: string;
  referenceId: string;
  referenceType: TeamNodeType;
};

type AgentTeamDefinitionSnapshot = {
  id?: string | null;
  name: string;
  nodes: TeamNodeSnapshot[];
};

type AgentDefinitionServiceLike = {
  getAllAgentDefinitions: () => Promise<AgentDefinitionSnapshot[]>;
};

type AgentTeamDefinitionServiceLike = {
  getAllDefinitions: () => Promise<AgentTeamDefinitionSnapshot[]>;
};

export interface ResolvedNodeSyncSelection {
  agentDefinitionIds: Set<string>;
  agentTeamDefinitionIds: Set<string>;
  promptFamilies: Set<string>;
  includeDeletes: boolean;
}

type ResolveSelectionOptions = {
  agentDefinitionService: AgentDefinitionServiceLike;
  agentTeamDefinitionService: AgentTeamDefinitionServiceLike;
};

function normalizeNonEmptyString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeIds(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const normalized = values
    .map((value) => normalizeNonEmptyString(value))
    .filter((value): value is string => value !== null);
  return Array.from(new Set(normalized));
}

function promptFamilyKey(category: string, name: string): string {
  return `${category}::${name}`;
}

export class NodeSyncSelectionService {
  constructor(
    private readonly options: ResolveSelectionOptions,
  ) {}

  async resolveSelection(
    selection: NodeSyncSelectionSpec | null | undefined,
  ): Promise<ResolvedNodeSyncSelection | null> {
    if (!selection) {
      return null;
    }

    const requestedAgentIds = normalizeIds(selection.agentDefinitionIds);
    const requestedTeamIds = normalizeIds(selection.agentTeamDefinitionIds);

    if (requestedAgentIds.length === 0 && requestedTeamIds.length === 0) {
      throw new NodeSyncSelectionValidationError(
        'selection-empty',
        'Selective sync requires at least one agent or team id.',
      );
    }

    const includeDependencies = selection.includeDependencies ?? false;
    const includeDeletes = selection.includeDeletes ?? false;

    const [allAgents, allTeams] = await Promise.all([
      this.options.agentDefinitionService.getAllAgentDefinitions(),
      this.options.agentTeamDefinitionService.getAllDefinitions(),
    ]);

    const agentsById = new Map(
      allAgents
        .filter((agent) => typeof agent.id === 'string' && agent.id.length > 0)
        .map((agent) => [agent.id as string, agent]),
    );
    const teamsById = new Map(
      allTeams
        .filter((team) => typeof team.id === 'string' && team.id.length > 0)
        .map((team) => [team.id as string, team]),
    );

    for (const agentId of requestedAgentIds) {
      if (!agentsById.has(agentId)) {
        throw new NodeSyncSelectionValidationError(
          'invalid-selection-agent-id',
          `Selected agent id was not found on source node: ${agentId}`,
        );
      }
    }

    for (const teamId of requestedTeamIds) {
      if (!teamsById.has(teamId)) {
        throw new NodeSyncSelectionValidationError(
          'invalid-selection-team-id',
          `Selected team id was not found on source node: ${teamId}`,
        );
      }
    }

    const resolvedAgentIds = new Set(requestedAgentIds);
    const resolvedTeamIds = new Set(requestedTeamIds);

    if (includeDependencies) {
      this.expandTeamDependencies(resolvedTeamIds, resolvedAgentIds, teamsById, agentsById);
    }

    const promptFamilies = includeDependencies
      ? this.resolvePromptFamilies(resolvedAgentIds, agentsById)
      : new Set<string>();

    return {
      agentDefinitionIds: resolvedAgentIds,
      agentTeamDefinitionIds: resolvedTeamIds,
      promptFamilies,
      includeDeletes,
    };
  }

  private expandTeamDependencies(
    resolvedTeamIds: Set<string>,
    resolvedAgentIds: Set<string>,
    teamsById: Map<string, AgentTeamDefinitionSnapshot>,
    agentsById: Map<string, AgentDefinitionSnapshot>,
  ): void {
    const queue = Array.from(resolvedTeamIds);
    while (queue.length > 0) {
      const teamId = queue.shift();
      if (!teamId) {
        continue;
      }
      const team = teamsById.get(teamId);
      if (!team) {
        throw new NodeSyncSelectionValidationError(
          'invalid-selection-team-id',
          `Selected team id was not found on source node: ${teamId}`,
        );
      }

      for (const member of team.nodes) {
        if (member.referenceType === TeamNodeType.AGENT) {
          if (!agentsById.has(member.referenceId)) {
            throw new NodeSyncSelectionValidationError(
              'team-member-missing',
              `Team '${team.name}' references missing agent '${member.referenceId}'.`,
            );
          }
          resolvedAgentIds.add(member.referenceId);
          continue;
        }

        if (member.referenceType === TeamNodeType.AGENT_TEAM) {
          if (!teamsById.has(member.referenceId)) {
            throw new NodeSyncSelectionValidationError(
              'nested-team-missing',
              `Team '${team.name}' references missing team '${member.referenceId}'.`,
            );
          }
          if (!resolvedTeamIds.has(member.referenceId)) {
            resolvedTeamIds.add(member.referenceId);
            queue.push(member.referenceId);
          }
        }
      }
    }
  }

  private resolvePromptFamilies(
    resolvedAgentIds: Set<string>,
    agentsById: Map<string, AgentDefinitionSnapshot>,
  ): Set<string> {
    const families = new Set<string>();
    for (const agentId of resolvedAgentIds) {
      const agent = agentsById.get(agentId);
      if (!agent) {
        throw new NodeSyncSelectionValidationError(
          'team-member-missing',
          `Resolved dependency agent '${agentId}' is missing on source node.`,
        );
      }
      const category = normalizeNonEmptyString(agent.systemPromptCategory);
      const name = normalizeNonEmptyString(agent.systemPromptName);
      if (!category || !name) {
        throw new NodeSyncSelectionValidationError(
          'agent-prompt-missing',
          `Agent '${agent.name}' is missing system prompt mapping.`,
        );
      }
      families.add(promptFamilyKey(category, name));
    }
    return families;
  }
}
