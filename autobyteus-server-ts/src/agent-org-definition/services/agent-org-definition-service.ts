import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { CollaborationHandoffCompiler } from "../../agent-collaboration/definition/collaboration-handoff-compiler.js";
import { DefinitionEndpointCatalog, type DefinitionEndpointCatalogProjection } from "../../agent-collaboration/definition/definition-endpoint-catalog.js";
import {
  getProcessAgentPackageDefinitions,
  type AgentPackageDefinitions,
} from "../../agent-package-definitions/services/agent-package-definitions.js";
import type { DefinitionLoadIssue, DefinitionLoadIssueEntry } from "../../agent-package-definitions/domain/agent-package-definition-types.js";
import { AgentOrgDefinition, AgentOrgDefinitionUpdate } from "../domain/agent-org-definition.js";
import { FileAgentOrgDefinitionProvider } from "../providers/file-agent-org-definition-provider.js";
import { AgentOrgDefinitionResolver } from "./agent-org-definition-resolver.js";

/** File writes only; every read is a store read. */
type AgentOrgDefinitionFileStore = Pick<FileAgentOrgDefinitionProvider, "create" | "update" | "delete">;

/** One AgentOrg admission entry from the agent package definitions; `definition` is the last good version, if any. */
export type AgentOrgAdmissionEntry = Readonly<{
  definitionId: string;
  definition: AgentOrgDefinition | null;
  issue: DefinitionLoadIssue | null;
  definitionPath: string;
  packageRoot: string;
  sourceClass: "server_data" | "implementation_repository" | "registered_package";
}>;

export class AgentOrgDefinitionService {
  private static instance: AgentOrgDefinitionService | null = null;
  static getInstance(): AgentOrgDefinitionService {
    return this.instance ??= new AgentOrgDefinitionService();
  }
  static bindProcessInstance(instance: AgentOrgDefinitionService): void {
    if (!instance) throw new Error("A process AgentOrgDefinitionService instance is required.");
    if (this.instance) throw new Error("The process AgentOrgDefinitionService is already initialized.");
    this.instance = instance;
  }
  static releaseProcessInstance(instance: AgentOrgDefinitionService): void {
    if (this.instance === instance) this.instance = null;
  }
  constructor(
    private readonly fileStore: AgentOrgDefinitionFileStore = new FileAgentOrgDefinitionProvider(),
    private readonly agentService: Pick<AgentDefinitionService, "getAgentDefinitionById"> = AgentDefinitionService.getInstance(),
    private readonly teamService: Pick<AgentTeamDefinitionService, "getDefinitionById"> = AgentTeamDefinitionService.getInstance(),
    private readonly packageDefinitions: AgentPackageDefinitions = getProcessAgentPackageDefinitions(),
  ) {}

  async getDefinitionById(id: string): Promise<AgentOrgDefinition | null> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.getDefinition("agent_org", id);
  }

  async getAllDefinitions(): Promise<AgentOrgDefinition[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.listFolderRoots("agent_org").flatMap((entry) => entry.definition ? [entry.definition] : []);
  }

  /** Every AgentOrg folder, last good or issue-only, for admission. */
  async listAdmissionEntries(): Promise<AgentOrgAdmissionEntry[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.listFolderRoots("agent_org").map((entry) => Object.freeze({
      definitionId: entry.id,
      definition: entry.definition,
      issue: entry.issue,
      definitionPath: entry.definition?.source?.definitionPath ?? entry.issue?.definitionPath ?? entry.location.folderDir,
      packageRoot: entry.location.packageRoot,
      sourceClass: entry.location.sourceClass,
    }));
  }

  async listLoadIssues(): Promise<Array<Readonly<{ definitionId: string; issue: DefinitionLoadIssue; usingLastGood: boolean }>>> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.listLoadIssueEntries("agent_org").map((entry) => Object.freeze({
      definitionId: entry.id,
      issue: entry.issue!,
      usingLastGood: entry.definition !== null,
    }));
  }

  /** Every load issue of each Org folder (the Org, its org-owned agents and Teams and their local agents), keyed by Org ID. */
  async listFolderLoadIssues(): Promise<Map<string, DefinitionLoadIssueEntry[]>> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.listFolderLoadIssues("agent_org");
  }

  async getFolderLoadIssues(id: string): Promise<DefinitionLoadIssueEntry[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.getFolderLoadIssues("agent_org", id);
  }

  /** Full reload of every registered agent package (manual Reload). */
  async reloadAgentPackageDefinitions(): Promise<void> {
    await this.packageDefinitions.reloader.reloadAllPackages();
  }

  private async validate(definition: AgentOrgDefinition, fallbackId?: string): Promise<void> {
    const resolved = await new AgentOrgDefinitionResolver().resolve({
      definition, definitionId: definition.id ?? fallbackId,
      lookup: {
        getAgentById: (id) => this.agentService.getAgentDefinitionById(id),
        getTeamById: (id) => this.teamService.getDefinitionById(id),
      },
    });
    new CollaborationHandoffCompiler().compileOrg(resolved);
  }
  async getEndpointCatalog(id: string): Promise<DefinitionEndpointCatalogProjection> {
    const definition = await this.getDefinitionById(id);
    if (!definition) throw new Error(`AgentOrg '${id}' was not found.`);
    const resolved = await new AgentOrgDefinitionResolver().resolve({
      definition,
      lookup: {
        getAgentById: (agentId) => this.agentService.getAgentDefinitionById(agentId),
        getTeamById: (teamId) => this.teamService.getDefinitionById(teamId),
      },
    });
    return new DefinitionEndpointCatalog().projectOrg(resolved);
  }
  async createDefinition(definition: AgentOrgDefinition): Promise<AgentOrgDefinition> {
    if (definition.id) throw new Error("Cannot create an AgentOrg that already has an id.");
    await this.validate(definition, "__new_agent_org_candidate__");
    const created = await this.fileStore.create(definition);
    if (created.id) await this.packageDefinitions.reloader.reloadFoldersNow("agent_org", [created.id]);
    return created;
  }
  async updateDefinition(id: string, update: AgentOrgDefinitionUpdate): Promise<AgentOrgDefinition> {
    const existing = await this.getDefinitionById(id);
    if (!existing) throw new Error(`AgentOrg '${id}' was not found.`);
    if (existing.revision !== update.values.expectedRevision) {
      const error = new Error("The AgentOrg changed after this draft was loaded. Refresh and apply the draft again.") as Error & { code: string };
      error.code = "DEFINITION_REVISION_CONFLICT"; throw error;
    }
    const v = update.values;
    const candidate = new AgentOrgDefinition({
      id, name: v.name ?? existing.name, description: v.description ?? existing.description,
      instructions: v.instructions ?? existing.instructions, category: v.category ?? existing.category,
      members: v.members ?? existing.members, handoffs: v.handoffs ?? existing.handoffs,
      avatarUrl: v.avatarUrl ?? existing.avatarUrl,
      defaultLaunchConfig: v.defaultLaunchConfig === undefined ? existing.defaultLaunchConfig : v.defaultLaunchConfig,
      revision: update.values.expectedRevision, source: existing.source,
    });
    await this.validate(candidate);
    const updated = await this.fileStore.update(candidate);
    await this.packageDefinitions.reloader.reloadFoldersNow("agent_org", [id]);
    return updated;
  }
  async deleteDefinition(id: string): Promise<boolean> {
    const deleted = await this.fileStore.delete(id);
    await this.packageDefinitions.reloader.reloadFoldersNow("agent_org", [id]);
    return deleted;
  }
}
