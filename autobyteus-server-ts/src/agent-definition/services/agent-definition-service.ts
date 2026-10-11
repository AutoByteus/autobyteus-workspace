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
  getDefaultDefinitionCatalogRuntime,
  type DefinitionCatalogRuntime,
} from "../../definition-catalog/services/definition-catalog-runtime.js";
import type { DefinitionCatalogIssue } from "../../definition-catalog/domain/definition-catalog-types.js";

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

/** File writes, templates and application-owned exact reads (registered package roots are catalog reads). */
export type AgentDefinitionFileStore = Pick<
  FileAgentDefinitionProvider,
  "create" | "getById" | "getTemplates" | "update" | "delete" | "listApplicationOwnedTeamLocalAgents"
>;

/** One definition's catalog issue, for diagnostics. */
export type AgentDefinitionIssueEntry = Readonly<{
  definitionId: string;
  issue: DefinitionCatalogIssue;
  usingLastGood: boolean;
}>;

/** Application-owned definitions are read from their bundle, not from the package catalog. */
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
  catalogRuntime?: DefinitionCatalogRuntime;
  registries?: Partial<ProcessorRegistries>;
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
  private readonly catalogRuntime: DefinitionCatalogRuntime;
  private registries: ProcessorRegistries;

  constructor(options: AgentDefinitionServiceOptions = {}) {
    this.fileStore = options.fileStore ?? new FileAgentDefinitionProvider();
    this.catalogRuntime = options.catalogRuntime ?? getDefaultDefinitionCatalogRuntime();
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
    if (created.id) await this.catalogRuntime.sync.reconcileNow("agent", [created.id]);
    logger.info(`Agent Definition created successfully with ID: ${String(created.id)}`);
    return this.stripMandatoryProcessors(created) ?? created;
  }

  /** The current stored definition (a copy), before mandatory-processor stripping. */
  private async readStoredDefinition(definitionId: string): Promise<AgentDefinition | null> {
    if (isApplicationOwnedAgentId(definitionId)) return this.fileStore.getById(definitionId);
    await this.catalogRuntime.sync.settle();
    return this.catalogRuntime.catalog.getDefinition("agent", definitionId);
  }

  /** Shared, team-local and org-owned IDs are catalog reads (last good honored); application-owned IDs read their bundle. */
  async getAgentDefinitionById(definitionId: string): Promise<AgentDefinition | null> {
    return this.stripMandatoryProcessors(await this.readStoredDefinition(definitionId));
  }

  /** Shared agents (first registered root wins) plus application-owned agents. */
  async getAllAgentDefinitions(): Promise<AgentDefinition[]> {
    await this.catalogRuntime.sync.settle();
    return this.catalogRuntime.catalog.listUnitRoots("agent")
      .flatMap((entry) => entry.definition ? [entry.definition] : [])
      .map((definition) => this.stripMandatoryProcessors(definition) ?? definition);
  }

  /** All agents plus the team-local agents of shared and application-owned Teams. */
  async getVisibleAgentDefinitions(): Promise<AgentDefinition[]> {
    const definitions = await this.getAllAgentDefinitions();
    const seenIds = new Set(definitions.map((definition) => definition.id));
    const teamLocal = this.catalogRuntime.catalog.listNestedNodes("agent_team", "agent")
      .flatMap((entry) => entry.definition ? [entry.definition] : []);
    for (const definition of [...teamLocal, ...await this.fileStore.listApplicationOwnedTeamLocalAgents()]) {
      if (seenIds.has(definition.id)) continue;
      seenIds.add(definition.id);
      definitions.push(this.stripMandatoryProcessors(definition) ?? definition);
    }
    return definitions;
  }

  /** Catalog issues of agent definitions (shared and nested), last good or not. */
  async listDefinitionIssues(): Promise<AgentDefinitionIssueEntry[]> {
    await this.catalogRuntime.sync.settle();
    return this.catalogRuntime.catalog.listIssueEntries("agent").map((entry) => Object.freeze({
      definitionId: entry.id,
      issue: entry.issue!,
      usingLastGood: entry.definition !== null,
    }));
  }

  async getDefinitionIssue(definitionId: string): Promise<DefinitionCatalogIssue | null> {
    await this.catalogRuntime.sync.settle();
    return this.catalogRuntime.catalog.getEntry("agent", definitionId)?.issue ?? null;
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
    await this.reconcileOwningUnit(definitionId);
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
    await this.reconcileOwningUnit(definitionId);
    if (success) {
      logger.info(`Agent Definition with ID ${definitionId} deleted successfully.`);
    } else {
      logger.warn(`Failed to delete agent definition with ID ${definitionId}.`);
    }
    return success;
  }

  /** Full reconcile of the definition catalog (manual Reload, package changes, application readiness). */
  async refreshCache(): Promise<void> {
    await this.catalogRuntime.sync.reloadAll();
  }

  /** An in-app write reconciles the unit that owns the definition (its Team or Org for nested agents). */
  private async reconcileOwningUnit(definitionId: string): Promise<void> {
    // Application-owned team-local agents are not catalog nodes.
    if (isApplicationOwnedAgentId(definitionId) && !parseCanonicalApplicationOwnedAgentId(definitionId)) return;
    const unit = this.catalogRuntime.catalog.unitOf("agent", definitionId)
      ?? { subject: "agent" as const, unitId: definitionId };
    await this.catalogRuntime.sync.reconcileNow(unit.subject, [unit.unitId]);
  }
}
