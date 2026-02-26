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
  update: (definition: AgentTeamDefinition) => Promise<AgentTeamDefinition>;
  delete: (id: string) => Promise<boolean>;
};

type AgentTeamDefinitionServiceOptions = {
  provider?: AgentTeamDefinitionProvider;
  persistenceProvider?: AgentTeamDefinitionPersistenceProvider;
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

  constructor(options: AgentTeamDefinitionServiceOptions = {}) {
    const persistenceProvider =
      options.persistenceProvider ?? new AgentTeamDefinitionPersistenceProvider();
    this.provider = options.provider ?? new CachedAgentTeamDefinitionProvider(persistenceProvider);
  }

  async createDefinition(definition: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if (definition.id) {
      throw new Error("Cannot create a definition that already has an ID.");
    }
    const created = await this.provider.create(definition);
    logger.info(`Agent Team Definition created successfully with ID: ${created.id}`);
    return created;
  }

  async getDefinitionById(definitionId: string): Promise<AgentTeamDefinition | null> {
    return this.provider.getById(definitionId);
  }

  async getAllDefinitions(): Promise<AgentTeamDefinition[]> {
    return this.provider.getAll();
  }

  async updateDefinition(
    definitionId: string,
    updateData: AgentTeamDefinitionUpdate,
  ): Promise<AgentTeamDefinition> {
    const existing = await this.provider.getById(definitionId);
    if (!existing) {
      throw new Error(`Agent Team Definition with ID ${definitionId} not found.`);
    }

    const updates: Record<string, unknown> = {
      name: updateData.name,
      description: updateData.description,
      role: updateData.role,
      nodes: updateData.nodes,
      coordinatorMemberName: updateData.coordinatorMemberName,
      avatarUrl: updateData.avatarUrl,
    };

    const updateRecord = existing as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(updates)) {
      if (value !== null && value !== undefined) {
        if (key in existing) {
          updateRecord[key] = value;
        }
      }
    }

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
}
