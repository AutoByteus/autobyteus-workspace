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
import { getInternalAgentVisibility, type InternalAgentVisibility } from "./internal-agent-visibility.js";
import type { AgentDefinitionChangeSignal } from "./agent-definition-change-signal.js";

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
  "create" | "getById" | "getTemplates" | "update" | "delete" | "listApplicationOwnedAgents" | "listApplicationOwnedTeamLocalAgents"
>;

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

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
  private registries: ProcessorRegistries;

  constructor(options: AgentDefinitionServiceOptions = {}) {
    this.fileStore = options.fileStore ?? new FileAgentDefinitionProvider();
    this.packageDefinitions = options.packageDefinitions ?? getProcessAgentPackageDefinitions();
    this.visibility = options.visibility ?? getInternalAgentVisibility();
    this.changeSignal = options.changeSignal ?? null;
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
    });

    const created = await this.fileStore.create(definition);
    if (created.id) await this.packageDefinitions.reloader.reloadFoldersNow("agent", [created.id]);
    logger.info(`Agent Definition created successfully with ID: ${String(created.id)}`);
    return this.stripMandatoryProcessors(created) ?? created;
  }

  /** The current stored definition (a copy), before mandatory-processor stripping. */
  private async readStoredDefinition(definitionId: string): Promise<AgentDefinition | null> {
    if (isApplicationOwnedAgentId(definitionId)) return this.fileStore.getById(definitionId);
    await this.packageDefinitions.reloader.applyPendingChanges();
    return this.packageDefinitions.store.getDefinition("agent", definitionId);
  }

  /** Shared, team-local and org-owned IDs are store reads (last good honored); application-package IDs read their package. */
  async getAgentDefinitionById(definitionId: string): Promise<AgentDefinition | null> {
    return this.stripMandatoryProcessors(await this.readStoredDefinition(definitionId));
  }

  /**
   * Shared agents (first registered agent package wins) plus application-package agents, read on
   * demand for IDs not already listed. A malformed application-package agent is skipped.
   */
  async getAllAgentDefinitions(): Promise<AgentDefinition[]> {
    await this.packageDefinitions.reloader.applyPendingChanges();
    const definitions = this.packageDefinitions.store.listFolderRoots("agent")
      .flatMap((entry) => entry.definition ? [entry.definition] : []);
    const seenIds = new Set(definitions.map((definition) => definition.id));
    for (const definition of await this.fileStore.listApplicationOwnedAgents()) {
      if (seenIds.has(definition.id)) continue;
      seenIds.add(definition.id);
      definitions.push(definition);
    }
    return definitions.map((definition) => this.stripMandatoryProcessors(definition) ?? definition);
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
      .flatMap((entry) => entry.definition ? [entry.definition] : []);
    for (const definition of [...teamLocal, ...await this.fileStore.listApplicationOwnedTeamLocalAgents()]) {
      if (seenIds.has(definition.id)) continue;
      seenIds.add(definition.id);
      definitions.push(this.stripMandatoryProcessors(definition) ?? definition);
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

  async updateAgentDefinition(
    definitionId: string,
    data: AgentDefinitionUpdateInput,
  ): Promise<AgentDefinition> {
    const existing = await this.readStoredDefinition(definitionId);
    if (!existing) {
      throw new Error(`Agent Definition with ID ${definitionId} not found.`);
    }

    const updateRecord = existing as unknown as Record<string, unknown>;
    const nullablePatchKeys = new Set(["avatarUrl", "defaultLaunchConfig"]);

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        continue;
      }
      if (value === null && !nullablePatchKeys.has(key)) {
        continue;
      }
      if (!(key in existing)) {
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
        default:
          break;
      }

      updateRecord[key] = nextValue;
    }

    const updated = await this.fileStore.update(existing);
    await this.reloadOwningFolder(definitionId);
    // An application-owned agent is read on demand, with no folder reload to announce it.
    if (isApplicationOwnedAgentId(definitionId)) this.changeSignal?.notifyChanged();
    logger.info(`Agent Definition with ID ${definitionId} updated successfully.`);
    return this.stripMandatoryProcessors(updated) ?? updated;
  }

  async deleteAgentDefinition(definitionId: string): Promise<boolean> {
    const existing = await this.readStoredDefinition(definitionId);
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
