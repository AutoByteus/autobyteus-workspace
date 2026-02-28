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

    const requestedAgentDefinitionIds = normalizeIds(selection.agentDefinitionIds);
    const requestedAgentTeamDefinitionIds = normalizeIds(selection.agentTeamDefinitionIds);

    if (requestedAgentDefinitionIds.length === 0 && requestedAgentTeamDefinitionIds.length === 0) {
      throw new NodeSyncSelectionValidationError(
        'selection-empty',
        'Selective sync requires at least one agent definition ID or team definition ID.',
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

    for (const agentDefinitionId of requestedAgentDefinitionIds) {
      if (!agentsById.has(agentDefinitionId)) {
        throw new NodeSyncSelectionValidationError(
          'invalid-selection-agent-id',
          `Selected agent definition ID was not found on source node: ${agentDefinitionId}`,
        );
      }
    }

    for (const teamDefinitionId of requestedAgentTeamDefinitionIds) {
      if (!teamsById.has(teamDefinitionId)) {
        throw new NodeSyncSelectionValidationError(
          'invalid-selection-team-id',
          `Selected team definition ID was not found on source node: ${teamDefinitionId}`,
        );
      }
    }

    const resolvedAgentDefinitionIds = new Set(requestedAgentDefinitionIds);
    const resolvedAgentTeamDefinitionIds = new Set(requestedAgentTeamDefinitionIds);

    if (includeDependencies) {
      this.expandTeamDependencies(
        resolvedAgentTeamDefinitionIds,
        resolvedAgentDefinitionIds,
        teamsById,
        agentsById,
      );
    }

    const promptFamilies = includeDependencies
      ? this.resolvePromptFamilies(resolvedAgentDefinitionIds, agentsById)
      : new Set<string>();

    return {
      agentDefinitionIds: resolvedAgentDefinitionIds,
      agentTeamDefinitionIds: resolvedAgentTeamDefinitionIds,
      promptFamilies,
      includeDeletes,
    };
  }

  private expandTeamDependencies(
    resolvedAgentTeamDefinitionIds: Set<string>,
    resolvedAgentDefinitionIds: Set<string>,
    teamsById: Map<string, AgentTeamDefinitionSnapshot>,
    agentsById: Map<string, AgentDefinitionSnapshot>,
  ): void {
    const queue = Array.from(resolvedAgentTeamDefinitionIds);
    while (queue.length > 0) {
      const teamDefinitionId = queue.shift();
      if (!teamDefinitionId) {
        continue;
      }
      const team = teamsById.get(teamDefinitionId);
      if (!team) {
        throw new NodeSyncSelectionValidationError(
          'invalid-selection-team-id',
          `Selected team definition ID was not found on source node: ${teamDefinitionId}`,
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
          resolvedAgentDefinitionIds.add(member.referenceId);
          continue;
        }

        if (member.referenceType === TeamNodeType.AGENT_TEAM) {
          if (!teamsById.has(member.referenceId)) {
            throw new NodeSyncSelectionValidationError(
              'nested-team-missing',
              `Team '${team.name}' references missing team '${member.referenceId}'.`,
            );
          }
          if (!resolvedAgentTeamDefinitionIds.has(member.referenceId)) {
            resolvedAgentTeamDefinitionIds.add(member.referenceId);
            queue.push(member.referenceId);
          }
        }
      }
    }
  }

  private resolvePromptFamilies(
    resolvedAgentDefinitionIds: Set<string>,
    agentsById: Map<string, AgentDefinitionSnapshot>,
  ): Set<string> {
    const families = new Set<string>();
    for (const agentDefinitionId of resolvedAgentDefinitionIds) {
      const agent = agentsById.get(agentDefinitionId);
      if (!agent) {
        throw new NodeSyncSelectionValidationError(
          'team-member-missing',
          `Resolved dependency agent definition '${agentDefinitionId}' is missing on source node.`,
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
