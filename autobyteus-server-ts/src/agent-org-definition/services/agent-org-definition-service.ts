import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { CollaborationHandoffCompiler } from "../../agent-collaboration/definition/collaboration-handoff-compiler.js";
import { DefinitionEndpointCatalog, type DefinitionEndpointCatalogProjection } from "../../agent-collaboration/definition/definition-endpoint-catalog.js";
import {
  getDefaultDefinitionCatalogRuntime,
  type DefinitionCatalogRuntime,
} from "../../definition-catalog/services/definition-catalog-runtime.js";
import type { DefinitionCatalogIssue, DefinitionUnitIssueEntry } from "../../definition-catalog/domain/definition-catalog-types.js";
import { AgentOrgDefinition, AgentOrgDefinitionUpdate } from "../domain/agent-org-definition.js";
import { FileAgentOrgDefinitionProvider } from "../providers/file-agent-org-definition-provider.js";
import { AgentOrgDefinitionResolver } from "./agent-org-definition-resolver.js";

/** File writes only; every read is a catalog read. */
type AgentOrgDefinitionFileStore = Pick<FileAgentOrgDefinitionProvider, "create" | "update" | "delete">;

/** One AgentOrg admission subject from the catalog; `definition` is the last good version, if any. */
export type AgentOrgAdmissionEntry = Readonly<{
  definitionId: string;
  definition: AgentOrgDefinition | null;
  issue: DefinitionCatalogIssue | null;
  definitionPath: string;
  packageRoot: string;
  sourceClass: "server_data" | "implementation_repository" | "external_read_only";
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
    private readonly catalogRuntime: DefinitionCatalogRuntime = getDefaultDefinitionCatalogRuntime(),
  ) {}

  async getDefinitionById(id: string): Promise<AgentOrgDefinition | null> {
    await this.catalogRuntime.sync.settle();
    return this.catalogRuntime.catalog.getDefinition("agent_org", id);
  }

  async getAllDefinitions(): Promise<AgentOrgDefinition[]> {
    await this.catalogRuntime.sync.settle();
    return this.catalogRuntime.catalog.listUnitRoots("agent_org").flatMap((entry) => entry.definition ? [entry.definition] : []);
  }

  /** Every AgentOrg unit, last good or issue-only, for admission. */
  async listAdmissionEntries(): Promise<AgentOrgAdmissionEntry[]> {
    await this.catalogRuntime.sync.settle();
    return this.catalogRuntime.catalog.listUnitRoots("agent_org").map((entry) => Object.freeze({
      definitionId: entry.id,
      definition: entry.definition,
      issue: entry.issue,
      definitionPath: entry.definition?.source?.definitionPath ?? entry.issue?.definitionPath ?? entry.location.unitDir,
      packageRoot: entry.location.packageRoot,
      sourceClass: entry.location.sourceClass,
    }));
  }

  async listDefinitionIssues(): Promise<Array<Readonly<{ definitionId: string; issue: DefinitionCatalogIssue; usingLastGood: boolean }>>> {
    await this.catalogRuntime.sync.settle();
    return this.catalogRuntime.catalog.listIssueEntries("agent_org").map((entry) => Object.freeze({
      definitionId: entry.id,
      issue: entry.issue!,
      usingLastGood: entry.definition !== null,
    }));
  }

  /** Every issue of each Org unit (the Org, its org-owned agents and Teams and their local agents), keyed by Org ID. */
  async listUnitIssues(): Promise<Map<string, DefinitionUnitIssueEntry[]>> {
    await this.catalogRuntime.sync.settle();
    return this.catalogRuntime.catalog.listUnitIssues("agent_org");
  }

  async getUnitIssues(id: string): Promise<DefinitionUnitIssueEntry[]> {
    await this.catalogRuntime.sync.settle();
    return this.catalogRuntime.catalog.getUnitIssues("agent_org", id);
  }

  /** Full reconcile of the definition catalog (the Orgs page Reload). */
  async refreshCache(): Promise<void> {
    await this.catalogRuntime.sync.reloadAll();
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
    if (created.id) await this.catalogRuntime.sync.reconcileNow("agent_org", [created.id]);
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
    await this.catalogRuntime.sync.reconcileNow("agent_org", [id]);
    return updated;
  }
  async deleteDefinition(id: string): Promise<boolean> {
    const deleted = await this.fileStore.delete(id);
    await this.catalogRuntime.sync.reconcileNow("agent_org", [id]);
    return deleted;
  }
}
