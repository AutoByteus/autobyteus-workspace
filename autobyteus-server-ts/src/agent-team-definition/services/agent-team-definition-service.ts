import {
  AgentTeamDefinition,
  AgentTeamDefinitionUpdate,
  TeamMember,
  type TeamMemberRefScope,
} from "../domain/agent-team-definition.js";
import { AgentTeamDefinitionPersistenceProvider } from "../providers/agent-team-definition-persistence-provider.js";
import { CachedAgentTeamDefinitionProvider } from "../providers/cached-agent-team-definition-provider.js";
import { normalizeDefaultLaunchConfigInput } from "../../launch-preferences/default-launch-config.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { assertValidFlatTeamDefinition } from "./flat-team-definition-validator.js";
import { FlatTeamDefinitionResolver } from "./flat-team-definition-resolver.js";
import { DefinitionEndpointCatalog, type DefinitionEndpointCatalogProjection } from "../../agent-collaboration/definition/definition-endpoint-catalog.js";

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
  nodes: Array<{ refScope: TeamMemberRefScope }>,
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
  revision: existing.revision,
  source: existing.source,
});

export class AgentTeamDefinitionService {
  private static instance: AgentTeamDefinitionService | null = null;

  static getInstance(options: AgentTeamDefinitionServiceOptions = {}): AgentTeamDefinitionService {
    if (!AgentTeamDefinitionService.instance) {
      AgentTeamDefinitionService.instance = new AgentTeamDefinitionService(options);
    }
    return AgentTeamDefinitionService.instance;
  }

  static bindProcessInstance(instance: AgentTeamDefinitionService): void {
    if (!instance) {
      throw new Error("A process AgentTeamDefinitionService instance is required.");
    }
    if (AgentTeamDefinitionService.instance) {
      throw new Error("The process AgentTeamDefinitionService is already initialized.");
    }
    AgentTeamDefinitionService.instance = instance;
  }

  static releaseProcessInstance(instance: AgentTeamDefinitionService): void {
    if (AgentTeamDefinitionService.instance === instance) {
      AgentTeamDefinitionService.instance = null;
    }
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
    const validationCandidate = new AgentTeamDefinition({
      ...definition,
      id: "__new_team_candidate__",
      nodes: cloneTeamMembers(definition.nodes),
    });
    await assertValidFlatTeamDefinition({
      rootDefinition: validationCandidate,
      lookup: { getAgentById: async (id) => this.agentDefinitionService.getFreshAgentDefinitionById(id) },
    });
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

  async getEndpointCatalog(definitionId: string): Promise<DefinitionEndpointCatalogProjection> {
    const definition = await this.provider.getById(definitionId);
    if (!definition) throw new Error(`Agent Team Definition with ID ${definitionId} not found.`);
    const topology = await new FlatTeamDefinitionResolver().resolve({
      rootDefinition: definition,
      lookup: { getAgentById: (id) => this.agentDefinitionService.getFreshAgentDefinitionById(id) },
    });
    return new DefinitionEndpointCatalog().projectTeam(topology);
  }

  async updateDefinition(
    definitionId: string,
    updateData: AgentTeamDefinitionUpdate,
  ): Promise<AgentTeamDefinition> {
    const existing = await this.provider.getById(definitionId);
    if (!existing) {
      throw new Error(`Agent Team Definition with ID ${definitionId} not found.`);
    }

    if (!updateData.expectedRevision) throw new Error("expectedRevision is required for Team definition update.");
    if (existing.revision !== updateData.expectedRevision) {
      const conflict = new Error("The Team definition changed after this draft was loaded. Refresh and apply the draft again.") as Error & { code: string };
      conflict.code = "DEFINITION_REVISION_CONFLICT";
      throw conflict;
    }
    const candidate = buildDefinitionUpdateCandidate(existing, updateData);
    candidate.revision = updateData.expectedRevision;
    assertValidTeamMembers(candidate.nodes);
    assertValidCoordinatorMember(candidate.coordinatorMemberName, candidate.nodes);
    await assertValidFlatTeamDefinition({
      rootDefinition: candidate,
      lookup: {
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

}
