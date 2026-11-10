import {
  defaultInputProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
  defaultToolExecutionResultProcessorRegistry,
  defaultToolInvocationPreprocessorRegistry,
  defaultLifecycleEventProcessorRegistry,
} from "autobyteus-ts";
import {
  AgentDefinition,
  normalizeAgentSkillScope,
  type AgentDefinitionDefaultLaunchConfig,
  type AgentSkillScope,
} from "../domain/models.js";
import { FileAgentDefinitionProvider } from "../providers/file-agent-definition-provider.js";
import { filterOptionalProcessorNames } from "../utils/processor-defaults.js";
import { normalizeDefaultLaunchConfigInput } from "../../launch-preferences/default-launch-config.js";
import { parseTeamLocalDefinitionId } from "../../agent-team-definition/utils/team-local-definition-id.js";
import {
  parseCanonicalApplicationOwnedAgentId,
  parseCanonicalApplicationOwnedTeamId,
} from "../../application-bundles/utils/application-bundle-identity.js";
import {
  getProcessAgentPackageDefinitions,
  type AgentPackageDefinitions,
} from "../../agent-package-definitions/services/agent-package-definitions.js";
import type { DefinitionLoadIssue } from "../../agent-package-definitions/domain/agent-package-definition-types.js";
import {
  PersonalSettingsService,
  type PersonalSettingsSourceClass,
  type PersonalSettingsView,
} from "../../personal-settings/services/personal-settings-service.js";
import type { PersonalSetting } from "../../personal-settings/domain/personal-setting-record.js";
import { getInternalAgentVisibility, type InternalAgentVisibility } from "./internal-agent-visibility.js";
import type { AgentDefinitionChangeSignal } from "./agent-definition-change-signal.js";
import { cloneAgent, normalizeOptionalString, personalEditsOf } from "./agent-definition-edits.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

type ProcessorOption = { name: string; isMandatory: boolean };

type ProcessorRegistry = {
  getOrderedProcessorOptions: () => ProcessorOption[];
};

type ProcessorRegistries = {
  input: ProcessorRegistry;
  llmResponse: ProcessorRegistry;
  toolExecutionResult: ProcessorRegistry;
  toolInvocationPreprocessor: ProcessorRegistry;
  lifecycle: ProcessorRegistry;
};

/** File writes, templates and application-package reads (agent package definitions are store reads). */
export type AgentDefinitionFileStore = Pick<
  FileAgentDefinitionProvider,
  | "create" | "getById" | "getTemplates" | "update" | "rendersDifferently" | "delete"
  | "listApplicationOwnedAgents" | "listApplicationOwnedTeamLocalAgents"
>;

/** The settings that are personal for package and built-in agents (the rest goes to the files). */
const PERSONAL_FIELDS: ReadonlySet<string> = new Set(["toolNames", "skillNames", "avatarUrl", "defaultLaunchConfig", "semanticMemoryEnabled"]);

/** A stored definition with where it was read from (null for an application-owned agent). */
type BaseRead = Readonly<{ definition: AgentDefinition | null; sourceClass: PersonalSettingsSourceClass | null }>;

/** One agent definition's load issue, for the definition problems list. */
export type AgentLoadIssueEntry = Readonly<{
  definitionId: string;
  issue: DefinitionLoadIssue;
  usingLastGood: boolean;
}>;

/** Application-package definitions are read from their application package, not from the agent package definitions. */
const isApplicationOwnedAgentId = (definitionId: string): boolean => {
  if (parseCanonicalApplicationOwnedAgentId(definitionId)) return true;
  const teamLocal = parseTeamLocalDefinitionId(definitionId);
  return Boolean(teamLocal && parseCanonicalApplicationOwnedTeamId(teamLocal.ownerTeamId));
};

export type AgentDefinitionCreateInput = {
  name: string;
  role?: string;
  description: string;
  instructions: string;
  category?: string;
  avatarUrl?: string | null;
  toolNames?: string[];
  inputProcessorNames?: string[];
  llmResponseProcessorNames?: string[];
  toolExecutionResultProcessorNames?: string[];
  toolInvocationPreprocessorNames?: string[];
  lifecycleProcessorNames?: string[];
  skillNames?: string[];
  skillScope?: AgentSkillScope;
  defaultLaunchConfig?: AgentDefinitionDefaultLaunchConfig | null;
  semanticMemoryEnabled?: boolean;
};

export type AgentDefinitionUpdateInput = Partial<AgentDefinitionCreateInput>;

type AgentDefinitionServiceOptions = {
  fileStore?: AgentDefinitionFileStore;
  packageDefinitions?: AgentPackageDefinitions;
  registries?: Partial<ProcessorRegistries>;
  /** The internal-agent rule for the visible list; the process rule by default. */
  visibility?: Pick<InternalAgentVisibility, "isHidden">;
  /** Announces a saved application-owned agent (package agents announce through their reload). */
  changeSignal?: Pick<AgentDefinitionChangeSignal, "notifyChanged">;
  /** The node's personal settings, applied on every agent package read; the process instance by default. */
  personalSettings?: PersonalSettingsService;
};

export class AgentDefinitionService {
  private static instance: AgentDefinitionService | null = null;

  static getInstance(options: AgentDefinitionServiceOptions = {}): AgentDefinitionService {
    if (!AgentDefinitionService.instance) {
      AgentDefinitionService.instance = new AgentDefinitionService(options);
    }
    return AgentDefinitionService.instance;
  }

  static bindProcessInstance(instance: AgentDefinitionService): void {
    if (!instance) {
      throw new Error("A process AgentDefinitionService instance is required.");
    }
    if (AgentDefinitionService.instance) {
      throw new Error("The process AgentDefinitionService is already initialized.");
    }
    AgentDefinitionService.instance = instance;
  }

  static releaseProcessInstance(instance: AgentDefinitionService): void {
    if (AgentDefinitionService.instance === instance) {
      AgentDefinitionService.instance = null;
    }
  }

  private readonly fileStore: AgentDefinitionFileStore;
  private readonly packageDefinitions: AgentPackageDefinitions;
  private readonly visibility: Pick<InternalAgentVisibility, "isHidden">;
  private readonly changeSignal: Pick<AgentDefinitionChangeSignal, "notifyChanged"> | null;
  private readonly personalSettings: PersonalSettingsService;
  private registries: ProcessorRegistries;

  constructor(options: AgentDefinitionServiceOptions = {}) {
    this.fileStore = options.fileStore ?? new FileAgentDefinitionProvider();
    this.packageDefinitions = options.packageDefinitions ?? getProcessAgentPackageDefinitions();
    this.visibility = options.visibility ?? getInternalAgentVisibility();
    this.changeSignal = options.changeSignal ?? null;
    this.personalSettings = options.personalSettings ?? PersonalSettingsService.getInstance();
    this.registries = {
      input: options.registries?.input ?? defaultInputProcessorRegistry,
      llmResponse: options.registries?.llmResponse ?? defaultLlmResponseProcessorRegistry,
      toolExecutionResult:
        options.registries?.toolExecutionResult ?? defaultToolExecutionResultProcessorRegistry,
      toolInvocationPreprocessor:
        options.registries?.toolInvocationPreprocessor ??
        defaultToolInvocationPreprocessorRegistry,
      lifecycle: options.registries?.lifecycle ?? defaultLifecycleEventProcessorRegistry,
    };
  }

  private stripMandatoryProcessors(definition: AgentDefinition | null): AgentDefinition | null {
    if (!definition) {
      return definition;
    }
    definition.inputProcessorNames = filterOptionalProcessorNames(
      definition.inputProcessorNames,
      this.registries.input,
    );
    definition.llmResponseProcessorNames = filterOptionalProcessorNames(
      definition.llmResponseProcessorNames,
      this.registries.llmResponse,
    );
    definition.toolExecutionResultProcessorNames = filterOptionalProcessorNames(
      definition.toolExecutionResultProcessorNames,
      this.registries.toolExecutionResult,
    );
    definition.toolInvocationPreprocessorNames = filterOptionalProcessorNames(
      definition.toolInvocationPreprocessorNames,
      this.registries.toolInvocationPreprocessor,
    );
    definition.lifecycleProcessorNames = filterOptionalProcessorNames(
      definition.lifecycleProcessorNames,
      this.registries.lifecycle,
    );
    return definition;
  }

  async createAgentDefinition(data: AgentDefinitionCreateInput): Promise<AgentDefinition> {
    if (!data.name || !data.description) {
      throw new Error("Missing required fields for agent definition creation.");
    }

    const definition = new AgentDefinition({
      name: data.name,
      role: data.role,
      description: data.description,
      instructions: data.instructions ?? "",
      category: data.category,
      avatarUrl: normalizeOptionalString(data.avatarUrl),
      toolNames: data.toolNames ?? [],
      inputProcessorNames: filterOptionalProcessorNames(
        data.inputProcessorNames ?? [],
        this.registries.input,
      ),
      llmResponseProcessorNames: filterOptionalProcessorNames(
        data.llmResponseProcessorNames ?? [],
        this.registries.llmResponse,
      ),
      toolExecutionResultProcessorNames: filterOptionalProcessorNames(
        data.toolExecutionResultProcessorNames ?? [],
        this.registries.toolExecutionResult,
      ),
      toolInvocationPreprocessorNames: filterOptionalProcessorNames(
        data.toolInvocationPreprocessorNames ?? [],
        this.registries.toolInvocationPreprocessor,
      ),
      lifecycleProcessorNames: filterOptionalProcessorNames(
        data.lifecycleProcessorNames ?? [],
        this.registries.lifecycle,
      ),
      skillNames: data.skillNames ?? [],
      skillScope: normalizeAgentSkillScope(data.skillScope),
      defaultLaunchConfig: normalizeDefaultLaunchConfigInput(data.defaultLaunchConfig) ?? null,
      semanticMemoryEnabled: data.semanticMemoryEnabled === true,
    });

    const created = await this.fileStore.create(definition);
    if (created.id) await this.packageDefinitions.reloader.reloadFoldersNow("agent", [created.id]);
    logger.info(`Agent Definition created successfully with ID: ${String(created.id)}`);
    return this.stripMandatoryProcessors(created) ?? created;
  }

  /**
   * The base value: the current stored definition (a copy), before mandatory-processor stripping
   * and without personal settings. Every write form starts from it.
   */
  private async readBaseDefinition(definitionId: string): Promise<BaseRead> {
    if (isApplicationOwnedAgentId(definitionId)) return { definition: await this.fileStore.getById(definitionId), sourceClass: null };
    await this.packageDefinitions.reloader.applyPendingChanges();
    const entry = this.packageDefinitions.store.getEntry("agent", definitionId);
    return { definition: entry?.definition ?? null, sourceClass: entry?.location.sourceClass ?? null };
  }

  /** What callers read: stripped of mandatory processors, with personal settings applied to package and built-in agents. */
  private effective(definition: AgentDefinition, sourceClass: PersonalSettingsSourceClass | null): AgentDefinition {
    const stripped = this.stripMandatoryProcessors(definition) ?? definition;
    return sourceClass ? this.personalSettings.apply("agent", stripped, sourceClass) : stripped;
  }

  /** Shared, team-local and org-owned IDs are store reads (last good honored); application-package IDs read their package. */
  async getAgentDefinitionById(definitionId: string): Promise<AgentDefinition | null> {
    const base = await this.readBaseDefinition(definitionId);
    return base.definition ? this.effective(base.definition, base.sourceClass) : null;
  }

  /**
   * Shared agents (first registered agent package wins) plus application-package agents, read on
   * demand for IDs not already listed. A malformed application-package agent is skipped.
   */
  async getAllAgentDefinitions(): Promise<AgentDefinition[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    const definitions = this.packageDefinitions.store.listFolderRoots("agent")
      .flatMap((entry) => entry.definition ? [this.effective(entry.definition, entry.location.sourceClass)] : []);
    const seenIds = new Set(definitions.map((definition) => definition.id));
    for (const definition of await this.fileStore.listApplicationOwnedAgents()) {
      if (seenIds.has(definition.id)) continue;
      seenIds.add(definition.id);
      definitions.push(this.effective(definition, null));
    }
    return definitions;
  }

  /**
   * The agents the user browses and picks (Agents page, every picker, mobile, application resources): every agent,
   * team-local ones included, except internal agents while they are hidden (autobyteus-308).
   */
  async getVisibleAgentDefinitions(): Promise<AgentDefinition[]> {
    return (await this.getAgentDefinitionsWithTeamLocal()).filter((definition) => !this.visibility.isHidden(definition));
  }

  /** All agents plus the team-local agents of shared and application-package Teams, internal ones included. */
  async getAgentDefinitionsWithTeamLocal(): Promise<AgentDefinition[]> {
    const definitions = await this.getAllAgentDefinitions();
    const seenIds = new Set(definitions.map((definition) => definition.id));
    const teamLocal = this.packageDefinitions.store.listNestedDefinitions("agent_team", "agent")
      .flatMap((entry) => entry.definition ? [this.effective(entry.definition, entry.location.sourceClass)] : []);
    const applicationTeamLocal = (await this.fileStore.listApplicationOwnedTeamLocalAgents())
      .map((definition) => this.effective(definition, null));
    for (const definition of [...teamLocal, ...applicationTeamLocal]) {
      if (seenIds.has(definition.id)) continue;
      seenIds.add(definition.id);
      definitions.push(definition);
    }
    return definitions;
  }

  /** Load issues of agent definitions (shared and nested), last good or not. */
  async listLoadIssues(): Promise<AgentLoadIssueEntry[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.listLoadIssueEntries("agent").map((entry) => Object.freeze({
      definitionId: entry.id,
      issue: entry.issue!,
      usingLastGood: entry.definition !== null,
    }));
  }

  async getLoadIssue(definitionId: string): Promise<DefinitionLoadIssue | null> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.getEntry("agent", definitionId)?.issue ?? null;
  }

  async getAgentTemplates(): Promise<AgentDefinition[]> {
    const definitions = await this.fileStore.getTemplates();
    return definitions
      .map((definition) => this.stripMandatoryProcessors(definition))
      .filter((item): item is AgentDefinition => item !== null);
  }

  /**
   * A save. For a package or built-in agent the personal settings go to the personal settings
   * file and the other fields to the agent's files, written only when their rendering changes;
   * every other agent is written to its files as before. Returns the effective definition.
   */
  async updateAgentDefinition(
    definitionId: string,
    data: AgentDefinitionUpdateInput,
  ): Promise<AgentDefinition> {
    const base = await this.readBaseDefinition(definitionId);
    if (!base.definition) {
      throw new Error(`Agent Definition with ID ${definitionId} not found.`);
    }
    if (!base.sourceClass || !this.personalSettings.appliesTo("agent", definitionId, base.sourceClass)) {
      const updated = await this.fileStore.update(this.patched(base.definition, data, new Set()));
      await this.reloadOwningFolder(definitionId);
      // An application-owned agent is read on demand, with no folder reload to announce it.
      if (isApplicationOwnedAgentId(definitionId)) this.changeSignal?.notifyChanged();
      logger.info(`Agent Definition with ID ${definitionId} updated successfully.`);
      return this.stripMandatoryProcessors(updated) ?? updated;
    }

    // Files first (validation may refuse them); the personal settings only after the files succeed.
    const baseValue = base.definition;
    const candidate = this.patched(baseValue, data, PERSONAL_FIELDS);
    const strip = (definition: AgentDefinition) => this.stripMandatoryProcessors(cloneAgent(definition)) ?? definition;
    if (this.fileStore.rendersDifferently(strip(baseValue), strip(candidate))) {
      await this.fileStore.update(candidate);
      await this.reloadOwningFolder(definitionId);
    }
    this.personalSettings.setEdited("agent", definitionId, baseValue, personalEditsOf(data));
    logger.info(`Agent Definition with ID ${definitionId} updated successfully.`);
    return (await this.getAgentDefinitionById(definitionId)) ?? this.effective(baseValue, base.sourceClass);
  }

  /** Removes one personal setting of a package or built-in agent; returns the effective definition. */
  async resetPersonalSetting(definitionId: string, setting: PersonalSetting): Promise<AgentDefinition> {
    const base = await this.readBaseDefinition(definitionId);
    if (!base.definition) throw new Error(`Agent Definition with ID ${definitionId} not found.`);
    if (!base.sourceClass || !this.personalSettings.appliesTo("agent", definitionId, base.sourceClass)) {
      throw new Error(`Agent Definition ${definitionId} has no personal settings.`);
    }
    this.personalSettings.reset("agent", definitionId, setting);
    return this.effective(base.definition, base.sourceClass);
  }

  /** Which settings of the agent are personal, and on which base (null: personal settings do not apply). */
  async getPersonalSettingsView(definitionId: string): Promise<PersonalSettingsView> {
    if (isApplicationOwnedAgentId(definitionId)) return { base: null, settings: [] };
    await this.packageDefinitions.reloader.applyPendingChanges();
    const store = this.packageDefinitions.store;
    const folder = store.folderOf("agent", definitionId);
    const sourceClass = folder ? store.folderLocation(folder.kind, folder.folderId)?.sourceClass ?? null : null;
    return sourceClass ? this.personalSettings.viewOf("agent", definitionId, sourceClass) : { base: null, settings: [] };
  }

  /** A copy of `existing` with the input's fields applied, except the `skipped` ones (normalized as for a create). */
  private patched(existing: AgentDefinition, data: AgentDefinitionUpdateInput, skipped: ReadonlySet<string>): AgentDefinition {
    const patched = cloneAgent(existing);
    const updateRecord = patched as unknown as Record<string, unknown>;
    const nullablePatchKeys = new Set(["avatarUrl", "defaultLaunchConfig"]);

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || skipped.has(key)) {
        continue;
      }
      if (value === null && !nullablePatchKeys.has(key)) {
        continue;
      }
      if (!(key in patched)) {
        continue;
      }

      let nextValue: unknown = value;
      switch (key) {
        case "inputProcessorNames":
          nextValue = filterOptionalProcessorNames(value as string[], this.registries.input);
          break;
        case "llmResponseProcessorNames":
          nextValue = filterOptionalProcessorNames(value as string[], this.registries.llmResponse);
          break;
        case "toolExecutionResultProcessorNames":
          nextValue = filterOptionalProcessorNames(
            value as string[],
            this.registries.toolExecutionResult,
          );
          break;
        case "toolInvocationPreprocessorNames":
          nextValue = filterOptionalProcessorNames(
            value as string[],
            this.registries.toolInvocationPreprocessor,
          );
          break;
        case "lifecycleProcessorNames":
          nextValue = filterOptionalProcessorNames(value as string[], this.registries.lifecycle);
          break;
        case "avatarUrl":
          nextValue = normalizeOptionalString(value);
          break;
        case "defaultLaunchConfig":
          nextValue = normalizeDefaultLaunchConfigInput(value) ?? null;
          break;
        case "skillScope":
          nextValue = normalizeAgentSkillScope(value);
          break;
        case "semanticMemoryEnabled":
          nextValue = value === true;
          break;
        default:
          break;
      }

      updateRecord[key] = nextValue;
    }
    return patched;
  }

  async deleteAgentDefinition(definitionId: string): Promise<boolean> {
    const existing = (await this.readBaseDefinition(definitionId)).definition;
    if (!existing) {
      throw new Error(`Agent Definition with ID ${definitionId} not found.`);
    }
    if (existing.ownershipScope !== "shared") {
      throw new Error("Deleting non-shared agent definitions is not supported.");
    }
    const success = await this.fileStore.delete(definitionId);
    await this.reloadOwningFolder(definitionId);
    if (success) {
      logger.info(`Agent Definition with ID ${definitionId} deleted successfully.`);
    } else {
      logger.warn(`Failed to delete agent definition with ID ${definitionId}.`);
    }
    return success;
  }

  /** Full reload of every registered agent package (manual Reload and package changes). */
  async reloadAgentPackageDefinitions(): Promise<void> {
    await this.packageDefinitions.reloader.reloadAllPackages();
  }

  /** An in-app write reloads the definition folder that holds the agent (its Team or Org folder for nested agents). */
  private async reloadOwningFolder(definitionId: string): Promise<void> {
    // Application-package agents are not agent package definitions; their lists are read on demand.
    if (isApplicationOwnedAgentId(definitionId)) return;
    const folder = this.packageDefinitions.store.folderOf("agent", definitionId)
      ?? { kind: "agent" as const, folderId: definitionId };
    await this.packageDefinitions.reloader.reloadFoldersNow(folder.kind, [folder.folderId]);
  }
}
