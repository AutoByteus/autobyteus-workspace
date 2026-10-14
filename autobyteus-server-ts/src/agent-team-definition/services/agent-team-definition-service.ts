import {
  AgentTeamDefinition,
  AgentTeamDefinitionUpdate,
  TeamMember,
  type TeamMemberRefScope,
} from "../domain/agent-team-definition.js";
import { FileAgentTeamDefinitionProvider } from "../providers/file-agent-team-definition-provider.js";
import { normalizeDefaultLaunchConfigInput } from "../../launch-preferences/default-launch-config.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { assertValidFlatTeamDefinition } from "./flat-team-definition-validator.js";
import { FlatTeamDefinitionResolver } from "./flat-team-definition-resolver.js";
import { DefinitionEndpointCatalog, type DefinitionEndpointCatalogProjection } from "../../agent-collaboration/definition/definition-endpoint-catalog.js";
import { parseCanonicalApplicationOwnedTeamId } from "../../application-bundles/utils/application-bundle-identity.js";
import {
  getProcessAgentPackageDefinitions,
  type AgentPackageDefinitions,
} from "../../agent-package-definitions/services/agent-package-definitions.js";
import type { DefinitionLoadIssue, DefinitionLoadIssueEntry } from "../../agent-package-definitions/domain/agent-package-definition-types.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

/** File writes, templates and application-package reads (agent package definitions are store reads). */
export type AgentTeamDefinitionFileStore = Pick<
  FileAgentTeamDefinitionProvider,
  "create" | "getById" | "getTemplates" | "update" | "delete" | "listApplicationOwnedTeams"
>;

/**
 * One Team admission entry from the agent package definitions: a shared Team or an org-owned Team.
 * `definition` is the last good version (null when it never read as valid).
 */
export type AgentTeamAdmissionEntry = Readonly<{
  definitionId: string;
  definition: AgentTeamDefinition | null;
  issue: DefinitionLoadIssue | null;
  definitionPath: string;
  packageRoot: string;
  sourceClass: "server_data" | "implementation_repository" | "registered_package";
}>;

type AgentTeamDefinitionServiceOptions = {
  fileStore?: AgentTeamDefinitionFileStore;
  packageDefinitions?: AgentPackageDefinitions;
  agentDefinitionService?: Pick<AgentDefinitionService, "getAgentDefinitionById">;
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

  private readonly fileStore: AgentTeamDefinitionFileStore;
  private readonly packageDefinitions: AgentPackageDefinitions;
  private readonly agentDefinitionService: Pick<AgentDefinitionService, "getAgentDefinitionById">;

  constructor(options: AgentTeamDefinitionServiceOptions = {}) {
    this.fileStore = options.fileStore ?? new FileAgentTeamDefinitionProvider();
    this.packageDefinitions = options.packageDefinitions ?? getProcessAgentPackageDefinitions();
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
      lookup: { getAgentById: async (id) => this.agentDefinitionService.getAgentDefinitionById(id) },
    });
    const created = await this.fileStore.create(definition);
    if (created.id) await this.packageDefinitions.reloader.reloadFoldersNow("agent_team", [created.id]);
    logger.info(`Agent Team Definition created successfully with ID: ${created.id}`);
    return created;
  }

  /** Shared and org-owned Team IDs are store reads (last good honored); application-package IDs read their package. */
  async getDefinitionById(definitionId: string): Promise<AgentTeamDefinition | null> {
    if (parseCanonicalApplicationOwnedTeamId(definitionId)) return this.fileStore.getById(definitionId);
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.getDefinition("agent_team", definitionId);
  }

  /**
   * Shared Teams plus application-package Teams, read on demand for IDs not already listed. A
   * duplicated Team identity is not listed; a malformed application-package Team is skipped.
   */
  async getAllDefinitions(): Promise<AgentTeamDefinition[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    const definitions = this.packageDefinitions.store.listFolderRoots("agent_team")
      .flatMap((entry) => entry.definition ? [entry.definition] : []);
    const seenIds = new Set(definitions.map((definition) => definition.id));
    for (const definition of await this.fileStore.listApplicationOwnedTeams()) {
      if (seenIds.has(definition.id)) continue;
      seenIds.add(definition.id);
      definitions.push(definition);
    }
    return definitions;
  }

  /** Team admission entries from the agent package definitions: shared Teams and org-owned Teams. */
  async listAdmissionEntries(): Promise<AgentTeamAdmissionEntry[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    const store = this.packageDefinitions.store;
    const entries = [
      ...store.listFolderRoots("agent_team"),
      ...store.listNestedDefinitions("agent_org", "agent_team"),
    ];
    return entries.map((entry) => Object.freeze({
      definitionId: entry.id,
      definition: entry.definition,
      issue: entry.issue,
      definitionPath: entry.definition?.source?.definitionPath ?? entry.issue?.definitionPath ?? entry.location.folderDir,
      packageRoot: entry.location.packageRoot,
      sourceClass: entry.location.sourceClass,
    }));
  }

  /** Load issues of Team definitions (shared and org-owned), last good or not. */
  async listLoadIssues(): Promise<Array<Readonly<{ definitionId: string; issue: DefinitionLoadIssue; usingLastGood: boolean }>>> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.listLoadIssueEntries("agent_team").map((entry) => Object.freeze({
      definitionId: entry.id,
      issue: entry.issue!,
      usingLastGood: entry.definition !== null,
    }));
  }

  /** Every load issue of each shared Team folder (the Team plus its team-local agents), keyed by Team ID. */
  async listFolderLoadIssues(): Promise<Map<string, DefinitionLoadIssueEntry[]>> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.listFolderLoadIssues("agent_team");
  }

  /**
   * The load issues shown on one Team's card: the whole Team folder for a shared Team; for an
   * org-owned Team (nested in its Org's folder, whose card carries the rest) only its own issue.
   */
  async getFolderLoadIssues(definitionId: string): Promise<DefinitionLoadIssueEntry[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    const store = this.packageDefinitions.store;
    const folder = store.folderOf("agent_team", definitionId);
    if (!folder) return [];
    const issues = store.getFolderLoadIssues(folder.kind, folder.folderId);
    return folder.kind === "agent_team"
      ? issues
      : issues.filter((entry) => entry.kind === "agent_team" && entry.definitionId === definitionId);
  }

  async getTemplateDefinitions(): Promise<AgentTeamDefinition[]> {
    return this.fileStore.getTemplates();
  }

  async getEndpointCatalog(definitionId: string): Promise<DefinitionEndpointCatalogProjection> {
    const definition = await this.getDefinitionById(definitionId);
    if (!definition) throw new Error(`Agent Team Definition with ID ${definitionId} not found.`);
    const topology = await new FlatTeamDefinitionResolver().resolve({
      rootDefinition: definition,
      lookup: { getAgentById: (id) => this.agentDefinitionService.getAgentDefinitionById(id) },
    });
    return new DefinitionEndpointCatalog().projectTeam(topology);
  }

  async updateDefinition(
    definitionId: string,
    updateData: AgentTeamDefinitionUpdate,
  ): Promise<AgentTeamDefinition> {
    const existing = await this.getDefinitionById(definitionId);
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
        getAgentById: async (id) => this.agentDefinitionService.getAgentDefinitionById(id),
      },
    });

    const updated = await this.fileStore.update(candidate);
    await this.reloadOwningFolder(definitionId);
    logger.info(`Agent Team Definition with ID ${definitionId} updated successfully.`);
    return updated;
  }

  async deleteDefinition(definitionId: string): Promise<boolean> {
    const existing = await this.getDefinitionById(definitionId);
    if (!existing) {
      throw new Error(`Agent Team Definition with ID ${definitionId} not found.`);
    }
    if ((existing.ownershipScope ?? "shared") !== "shared") {
      throw new Error("Deleting application-owned team definitions is not supported.");
    }
    const success = await this.fileStore.delete(definitionId);
    await this.reloadOwningFolder(definitionId);
    if (success) {
      logger.info(`Agent Team Definition with ID ${definitionId} deleted successfully.`);
    } else {
      logger.warn(`Failed to delete agent team definition with ID ${definitionId}.`);
    }
    return success;
  }

  /** Full reload of every registered agent package (manual Reload and package changes). */
  async reloadAgentPackageDefinitions(): Promise<void> {
    await this.packageDefinitions.reloader.reloadAllPackages();
  }

  /** An in-app write reloads the definition folder that holds the Team (its Org folder for an org-owned Team). */
  private async reloadOwningFolder(definitionId: string): Promise<void> {
    // Application-package Teams are not agent package definitions; their lists are read on demand.
    if (parseCanonicalApplicationOwnedTeamId(definitionId)) return;
    const folder = this.packageDefinitions.store.folderOf("agent_team", definitionId)
      ?? { kind: "agent_team" as const, folderId: definitionId };
    await this.packageDefinitions.reloader.reloadFoldersNow(folder.kind, [folder.folderId]);
  }
}
