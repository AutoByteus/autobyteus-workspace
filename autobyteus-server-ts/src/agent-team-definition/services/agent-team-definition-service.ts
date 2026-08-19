import {
  AgentTeamDefinition,
  AgentTeamDefinitionUpdate,
  TeamMember,
  type TeamMemberRefScope,
} from "../domain/models.js";
import { AgentTeamDefinitionPersistenceProvider } from "../providers/agent-team-definition-persistence-provider.js";
import { CachedAgentTeamDefinitionProvider } from "../providers/cached-agent-team-definition-provider.js";
import { normalizeDefaultLaunchConfigInput } from "../../launch-preferences/default-launch-config.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { assertValidTeamDefinitionGraph } from "./team-definition-graph-validator.js";

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
  agentDefinitionService?: Pick<AgentDefinitionService, "getAgentDefinitionById" | "getFreshAgentDefinitionById">;
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

const assertValidTeamMembers = (
  nodes: Array<{ refType: "agent" | "agent_team"; refScope?: TeamMemberRefScope | null }>,
): void => {
  for (const node of nodes) {
    if (!node.refScope) {
      throw new Error(
        "Team members must include refScope 'shared', 'team_local', or 'application_owned'.",
      );
    }
  }
};

const hasUpdateValue = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

const cloneTeamMembers = (nodes: readonly TeamMember[]): TeamMember[] =>
  nodes.map((node) => new TeamMember({
    memberName: node.memberName,
    ref: node.ref,
    refType: node.refType,
    refScope: node.refScope,
  }));

const cloneDefaultLaunchConfig = (
  value: AgentTeamDefinition["defaultLaunchConfig"],
): AgentTeamDefinition["defaultLaunchConfig"] => value ? {
  llmModelIdentifier: value.llmModelIdentifier,
  runtimeKind: value.runtimeKind,
  llmConfig: value.llmConfig ? structuredClone(value.llmConfig) : null,
} : null;

const buildDefinitionUpdateCandidate = (
  existing: AgentTeamDefinition,
  updateData: AgentTeamDefinitionUpdate,
): AgentTeamDefinition => new AgentTeamDefinition({
  id: existing.id,
  name: hasUpdateValue(updateData.name) ? updateData.name : existing.name,
  description: hasUpdateValue(updateData.description)
    ? updateData.description
    : existing.description,
  instructions: hasUpdateValue(updateData.instructions)
    ? updateData.instructions
    : existing.instructions,
  category: hasUpdateValue(updateData.category) ? updateData.category : existing.category,
  nodes: cloneTeamMembers(hasUpdateValue(updateData.nodes) ? updateData.nodes : existing.nodes),
  coordinatorMemberName: hasUpdateValue(updateData.coordinatorMemberName)
    ? updateData.coordinatorMemberName
    : existing.coordinatorMemberName,
  handoffs: hasUpdateValue(updateData.handoffs) ? updateData.handoffs : existing.handoffs,
  avatarUrl: hasUpdateValue(updateData.avatarUrl)
    ? normalizeOptionalString(updateData.avatarUrl)
    : existing.avatarUrl,
  defaultLaunchConfig: updateData.defaultLaunchConfig === undefined
    ? cloneDefaultLaunchConfig(existing.defaultLaunchConfig)
    : normalizeDefaultLaunchConfigInput(updateData.defaultLaunchConfig) ?? null,
  ownershipScope: existing.ownershipScope,
  ownerTeamId: existing.ownerTeamId,
  ownerTeamName: existing.ownerTeamName,
  ownerApplicationId: existing.ownerApplicationId,
  ownerApplicationName: existing.ownerApplicationName,
  ownerPackageId: existing.ownerPackageId,
  ownerLocalApplicationId: existing.ownerLocalApplicationId,
});

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
  private readonly agentDefinitionService: Pick<AgentDefinitionService, "getAgentDefinitionById" | "getFreshAgentDefinitionById">;

  constructor(options: AgentTeamDefinitionServiceOptions = {}) {
    const persistenceProvider =
      options.persistenceProvider ?? new AgentTeamDefinitionPersistenceProvider();
    this.provider = options.provider ?? new CachedAgentTeamDefinitionProvider(persistenceProvider);
    this.freshProvider = options.persistenceProvider ?? persistenceProvider;
    this.agentDefinitionService = options.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }

  async createDefinition(definition: AgentTeamDefinition): Promise<AgentTeamDefinition> {
    if (definition.id) {
      throw new Error("Cannot create a definition that already has an ID.");
    }

    assertValidTeamMembers(definition.nodes);
    assertValidCoordinatorMember(definition.coordinatorMemberName, definition.nodes);
    definition.avatarUrl = normalizeOptionalString(definition.avatarUrl);
    definition.defaultLaunchConfig =
      normalizeDefaultLaunchConfigInput(definition.defaultLaunchConfig) ?? null;
    const created = await this.provider.create(definition);
    await this.assertDefinitionGraphOrRollback(created);
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

    const candidate = buildDefinitionUpdateCandidate(existing, updateData);
    assertValidTeamMembers(candidate.nodes);
    assertValidCoordinatorMember(candidate.coordinatorMemberName, candidate.nodes);
    await assertValidTeamDefinitionGraph({
      rootDefinition: candidate,
      lookup: {
        getTeamById: async (id) => id === candidate.id ? candidate : this.provider.getById(id),
        getAgentById: async (id) => this.agentDefinitionService.getFreshAgentDefinitionById(id),
      },
    });

    const updated = await this.provider.update(candidate);
    logger.info(`Agent Team Definition with ID ${definitionId} updated successfully.`);
    return updated;
  }

  async deleteDefinition(definitionId: string): Promise<boolean> {
    const existing = await this.provider.getById(definitionId);
    if (!existing) {
      throw new Error(`Agent Team Definition with ID ${definitionId} not found.`);
    }
    if ((existing.ownershipScope ?? "shared") !== "shared") {
      throw new Error("Deleting application-owned team definitions is not supported.");
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

  private async assertDefinitionGraphOrRollback(definition: AgentTeamDefinition): Promise<void> {
    try {
      await assertValidTeamDefinitionGraph({
        rootDefinition: definition,
        lookup: {
          getTeamById: async (id) => id === definition.id ? definition : this.provider.getById(id),
          getAgentById: async (id) => this.agentDefinitionService.getFreshAgentDefinitionById(id),
        },
      });
    } catch (error) {
      if (definition.id) {
        await this.provider.delete(definition.id).catch((rollbackError) => {
          logger.warn(
            `Failed to roll back invalid agent team definition '${definition.id}': ${
              rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
            }`,
          );
        });
      }
      throw error;
    }
  }
}
