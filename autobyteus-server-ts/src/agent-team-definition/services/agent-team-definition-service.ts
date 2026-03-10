import { AgentTeamDefinition, AgentTeamDefinitionUpdate } from "../domain/models.js";
import { AgentTeamDefinitionPersistenceProvider } from "../providers/agent-team-definition-persistence-provider.js";
import { CachedAgentTeamDefinitionProvider } from "../providers/cached-agent-team-definition-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

type AgentTeamDefinitionProvider = {
  create: (definition: AgentTeamDefinition) => Promise<AgentTeamDefinition>;
  getById: (id: string) => Promise<AgentTeamDefinition | null>;
  getAll: () => Promise<AgentTeamDefinition[]>;
  getTemplates: () => Promise<AgentTeamDefinition[]>;
  update: (definition: AgentTeamDefinition) => Promise<AgentTeamDefinition>;
  delete: (id: string) => Promise<boolean>;
  refresh?: () => Promise<void>;
};

type AgentTeamDefinitionFreshProvider = Pick<AgentTeamDefinitionPersistenceProvider, "getById">;

type AgentTeamDefinitionServiceOptions = {
  provider?: AgentTeamDefinitionProvider;
  persistenceProvider?: AgentTeamDefinitionPersistenceProvider;
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const assertValidCoordinatorMember = (
  coordinatorMemberName: string,
  nodes: Array<{ memberName: string }>,
): void => {
  const matches = nodes.some((member) => member.memberName === coordinatorMemberName);
  if (!matches) {
    throw new Error("Coordinator member name must match one of nodes.memberName values.");
  }
};

export class AgentTeamDefinitionService {
  private static instance: AgentTeamDefinitionService | null = null;

  static getInstance(options: AgentTeamDefinitionServiceOptions = {}): AgentTeamDefinitionService {
    if (!AgentTeamDefinitionService.instance) {
      AgentTeamDefinitionService.instance = new AgentTeamDefinitionService(options);
    }
    return AgentTeamDefinitionService.instance;
  }

  readonly provider: AgentTeamDefinitionProvider;
  private readonly freshProvider: AgentTeamDefinitionFreshProvider;

  constructor(options: AgentTeamDefinitionServiceOptions = {}) {
    const persistenceProvider =
      options.persistenceProvider ?? new AgentTeamDefinitionPersistenceProvider();
    this.provider = options.provider ?? new CachedAgentTeamDefinitionProvider(persistenceProvider);
    this.freshProvider = options.persistenceProvider ?? persistenceProvider;
  }

  async createDefinition(definition: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if (definition.id) {
      throw new Error("Cannot create a definition that already has an ID.");
    }

    assertValidCoordinatorMember(definition.coordinatorMemberName, definition.nodes);
    definition.avatarUrl = normalizeOptionalString(definition.avatarUrl);
    const created = await this.provider.create(definition);
    logger.info(`Agent Team Definition created successfully with ID: ${created.id}`);
    return created;
  }

  async getDefinitionById(definitionId: string): Promise<AgentTeamDefinition | null> {
    return this.provider.getById(definitionId);
  }

  async getFreshDefinitionById(definitionId: string): Promise<AgentTeamDefinition | null> {
    return this.freshProvider.getById(definitionId);
  }

  async getAllDefinitions(): Promise<AgentTeamDefinition[]> {
    return this.provider.getAll();
  }

  async getTemplateDefinitions(): Promise<AgentTeamDefinition[]> {
    return this.provider.getTemplates();
  }

  async updateDefinition(
    definitionId: string,
    updateData: AgentTeamDefinitionUpdate,
  ): Promise<AgentTeamDefinition> {
    const existing = await this.provider.getById(definitionId);
    if (!existing) {
      throw new Error(`Agent Team Definition with ID ${definitionId} not found.`);
    }

    if (updateData.name !== null && updateData.name !== undefined) {
      existing.name = updateData.name;
    }
    if (updateData.description !== null && updateData.description !== undefined) {
      existing.description = updateData.description;
    }
    if (updateData.instructions !== null && updateData.instructions !== undefined) {
      existing.instructions = updateData.instructions;
    }
    if (updateData.category !== null && updateData.category !== undefined) {
      existing.category = updateData.category;
    }
    if (updateData.nodes !== null && updateData.nodes !== undefined) {
      existing.nodes = updateData.nodes;
    }
    if (
      updateData.coordinatorMemberName !== null &&
      updateData.coordinatorMemberName !== undefined
    ) {
      existing.coordinatorMemberName = updateData.coordinatorMemberName;
    }
    if (updateData.avatarUrl !== null && updateData.avatarUrl !== undefined) {
      existing.avatarUrl = normalizeOptionalString(updateData.avatarUrl);
    }

    assertValidCoordinatorMember(existing.coordinatorMemberName, existing.nodes);

    const updated = await this.provider.update(existing);
    logger.info(`Agent Team Definition with ID ${definitionId} updated successfully.`);
    return updated;
  }

  async deleteDefinition(definitionId: string): Promise<boolean> {
    const existing = await this.provider.getById(definitionId);
    if (!existing) {
      throw new Error(`Agent Team Definition with ID ${definitionId} not found.`);
    }
    const success = await this.provider.delete(definitionId);
    if (success) {
      logger.info(`Agent Team Definition with ID ${definitionId} deleted successfully.`);
    } else {
      logger.warn(`Failed to delete agent team definition with ID ${definitionId}.`);
    }
    return success;
  }

  async refreshCache(): Promise<void> {
    if (typeof this.provider.refresh === "function") {
      await this.provider.refresh();
    }
  }
}
