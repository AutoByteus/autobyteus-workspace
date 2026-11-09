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
import { normalizeDefaultLaunchConfigInput } from "../../launch-preferences/default-launch-config.js";
import {
  PersonalSettingsService,
  type PersonalSettingsSourceClass,
  type PersonalSettingsView,
} from "../../personal-settings/services/personal-settings-service.js";
import type { PersonalSetting } from "../../personal-settings/domain/personal-setting-record.js";

/** File writes only; every read is a store read. */
type AgentOrgDefinitionFileStore = Pick<FileAgentOrgDefinitionProvider, "create" | "update" | "rendersDifferently" | "delete">;

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
    /** The node's personal settings (avatar and runtime/model), applied on every read of a package Org. */
    private readonly personalSettings: PersonalSettingsService = PersonalSettingsService.getInstance(),
  ) {}

  /** The base value (no personal settings) and where it was read from; every write form starts from it. */
  private async readBaseDefinition(id: string): Promise<Readonly<{ definition: AgentOrgDefinition | null; sourceClass: PersonalSettingsSourceClass | null }>> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    const entry = this.packageDefinitions.store.getEntry("agent_org", id);
    return { definition: entry?.definition ?? null, sourceClass: entry?.location.sourceClass ?? null };
  }

  private effective(definition: AgentOrgDefinition, sourceClass: PersonalSettingsSourceClass): AgentOrgDefinition {
    return this.personalSettings.apply("agent_org", definition, sourceClass);
  }

  async getDefinitionById(id: string): Promise<AgentOrgDefinition | null> {
    const base = await this.readBaseDefinition(id);
    return base.definition && base.sourceClass ? this.effective(base.definition, base.sourceClass) : null;
  }

  async getAllDefinitions(): Promise<AgentOrgDefinition[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.listFolderRoots("agent_org")
      .flatMap((entry) => entry.definition ? [this.effective(entry.definition, entry.location.sourceClass)] : []);
  }

  /** Every AgentOrg folder, last good or issue-only, for admission. */
  async listAdmissionEntries(): Promise<AgentOrgAdmissionEntry[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.listFolderRoots("agent_org").map((entry) => Object.freeze({
      definitionId: entry.id,
      definition: entry.definition ? this.effective(entry.definition, entry.location.sourceClass) : null,
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
  /**
   * A save. For a package Org the avatar and runtime/model go to the personal settings file and the
   * other fields to the Org's files, written only when their rendering changes; an Org of the app's
   * own folder is written to its files as before. Returns the effective definition.
   */
  async updateDefinition(id: string, update: AgentOrgDefinitionUpdate): Promise<AgentOrgDefinition> {
    const base = await this.readBaseDefinition(id);
    const existing = base.definition;
    if (!existing || !base.sourceClass) throw new Error(`AgentOrg '${id}' was not found.`);
    if (existing.revision !== update.values.expectedRevision) {
      const error = new Error("The AgentOrg changed after this draft was loaded. Refresh and apply the draft again.") as Error & { code: string };
      error.code = "DEFINITION_REVISION_CONFLICT"; throw error;
    }
    const v = update.values;
    const personal = this.personalSettings.appliesTo("agent_org", id, base.sourceClass);
    const candidate = new AgentOrgDefinition({
      id, name: v.name ?? existing.name, description: v.description ?? existing.description,
      instructions: v.instructions ?? existing.instructions, category: v.category ?? existing.category,
      members: v.members ?? existing.members, handoffs: v.handoffs ?? existing.handoffs,
      avatarUrl: personal ? existing.avatarUrl : v.avatarUrl ?? existing.avatarUrl,
      defaultLaunchConfig: personal || v.defaultLaunchConfig === undefined ? existing.defaultLaunchConfig : v.defaultLaunchConfig,
      revision: update.values.expectedRevision, source: existing.source,
    });
    if (!personal || this.fileStore.rendersDifferently(existing, candidate)) {
      await this.validate(candidate);
      const updated = await this.fileStore.update(candidate);
      await this.packageDefinitions.reloader.reloadFoldersNow("agent_org", [id]);
      if (!personal) return updated;
    }
    this.personalSettings.setEdited("agent_org", id, existing, {
      // null or absent means "not sent" (as for the files); "" clears the personal avatar, back to the base.
      ...(v.avatarUrl !== undefined && v.avatarUrl !== null ? { avatarUrl: v.avatarUrl.trim() || null } : {}),
      ...(v.defaultLaunchConfig !== undefined ? { defaultLaunchConfig: normalizeDefaultLaunchConfigInput(v.defaultLaunchConfig) ?? null } : {}),
    });
    return (await this.getDefinitionById(id)) ?? this.effective(existing, base.sourceClass);
  }

  /** Removes one personal setting (avatar or runtime/model) of a package Org; returns the effective definition. */
  async resetPersonalSetting(id: string, setting: PersonalSetting): Promise<AgentOrgDefinition> {
    const base = await this.readBaseDefinition(id);
    if (!base.definition || !base.sourceClass) throw new Error(`AgentOrg '${id}' was not found.`);
    if (!this.personalSettings.appliesTo("agent_org", id, base.sourceClass)) throw new Error(`AgentOrg '${id}' has no personal settings.`);
    this.personalSettings.reset("agent_org", id, setting);
    return this.effective(base.definition, base.sourceClass);
  }

  /** Which settings of the Org are personal, and on which base (null: personal settings do not apply). */
  async getPersonalSettingsView(id: string): Promise<PersonalSettingsView> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    const sourceClass = this.packageDefinitions.store.folderLocation("agent_org", id)?.sourceClass ?? null;
    return sourceClass ? this.personalSettings.viewOf("agent_org", id, sourceClass) : { base: null, settings: [] };
  }
  async deleteDefinition(id: string): Promise<boolean> {
    const deleted = await this.fileStore.delete(id);
    await this.packageDefinitions.reloader.reloadFoldersNow("agent_org", [id]);
    return deleted;
  }
}
