import {
  defaultInputProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
  defaultSystemPromptProcessorRegistry,
  defaultToolExecutionResultProcessorRegistry,
  defaultToolInvocationPreprocessorRegistry,
  defaultLifecycleEventProcessorRegistry,
} from "autobyteus-ts";
import {
  AgentDefinition,
  type AgentDefinitionDefaultLaunchConfig,
} from "../domain/models.js";
import { AgentDefinitionPersistenceProvider } from "../providers/agent-definition-persistence-provider.js";
import { CachedAgentDefinitionProvider } from "../providers/cached-agent-definition-provider.js";
import { filterOptionalProcessorNames } from "../utils/processor-defaults.js";
import { normalizeDefaultLaunchConfigInput } from "../../launch-preferences/default-launch-config.js";

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
  systemPrompt: ProcessorRegistry;
  toolExecutionResult: ProcessorRegistry;
  toolInvocationPreprocessor: ProcessorRegistry;
  lifecycle: ProcessorRegistry;
};

type AgentDefinitionProvider = {
  create: (definition: AgentDefinition) => Promise<AgentDefinition>;
  getById: (id: string) => Promise<AgentDefinition | null>;
  getAll: () => Promise<AgentDefinition[]>;
  getAllVisible: () => Promise<AgentDefinition[]>;
  getTemplates: () => Promise<AgentDefinition[]>;
  update: (definition: AgentDefinition) => Promise<AgentDefinition>;
  delete: (id: string) => Promise<boolean>;
  duplicate: (sourceId: string, newId: string, newName: string) => Promise<AgentDefinition>;
  refresh?: () => Promise<void>;
};

type AgentDefinitionFreshProvider = Pick<AgentDefinitionPersistenceProvider, "getById">;

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const slugify = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "agent";
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
  systemPromptProcessorNames?: string[];
  toolExecutionResultProcessorNames?: string[];
  toolInvocationPreprocessorNames?: string[];
  lifecycleProcessorNames?: string[];
  skillNames?: string[];
  defaultLaunchConfig?: AgentDefinitionDefaultLaunchConfig | null;
};

export type AgentDefinitionUpdateInput = Partial<AgentDefinitionCreateInput>;

type AgentDefinitionServiceOptions = {
  provider?: AgentDefinitionProvider;
  persistenceProvider?: AgentDefinitionPersistenceProvider;
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

  readonly provider: AgentDefinitionProvider;
  private readonly freshProvider: AgentDefinitionFreshProvider;
  private registries: ProcessorRegistries;

  constructor(options: AgentDefinitionServiceOptions = {}) {
    const persistenceProvider =
      options.persistenceProvider ?? new AgentDefinitionPersistenceProvider();
    this.provider = options.provider ?? new CachedAgentDefinitionProvider(persistenceProvider);
    this.freshProvider = options.persistenceProvider ?? persistenceProvider;
    this.registries = {
      input: options.registries?.input ?? defaultInputProcessorRegistry,
      llmResponse: options.registries?.llmResponse ?? defaultLlmResponseProcessorRegistry,
      systemPrompt: options.registries?.systemPrompt ?? defaultSystemPromptProcessorRegistry,
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
    definition.systemPromptProcessorNames = filterOptionalProcessorNames(
      definition.systemPromptProcessorNames,
      this.registries.systemPrompt,
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

  private nextAgentId(name: string): string {
    return slugify(name);
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
      systemPromptProcessorNames: filterOptionalProcessorNames(
        data.systemPromptProcessorNames ?? [],
        this.registries.systemPrompt,
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
      defaultLaunchConfig: normalizeDefaultLaunchConfigInput(data.defaultLaunchConfig) ?? null,
    });

    const created = await this.provider.create(definition);
    logger.info(`Agent Definition created successfully with ID: ${String(created.id)}`);
    return this.stripMandatoryProcessors(created) ?? created;
  }

  async getAgentDefinitionById(definitionId: string): Promise<AgentDefinition | null> {
    const definition = await this.provider.getById(definitionId);
    return this.stripMandatoryProcessors(definition);
  }

  async getFreshAgentDefinitionById(definitionId: string): Promise<AgentDefinition | null> {
    const definition = await this.freshProvider.getById(definitionId);
    return this.stripMandatoryProcessors(definition);
  }

  async getAllAgentDefinitions(): Promise<AgentDefinition[]> {
    const definitions = await this.provider.getAll();
    return definitions
      .map((definition) => this.stripMandatoryProcessors(definition))
      .filter((item): item is AgentDefinition => item !== null);
  }

  async getVisibleAgentDefinitions(): Promise<AgentDefinition[]> {
    const definitions = await this.provider.getAllVisible();
    return definitions
      .map((definition) => this.stripMandatoryProcessors(definition))
      .filter((item): item is AgentDefinition => item !== null);
  }

  async getAgentTemplates(): Promise<AgentDefinition[]> {
    const definitions = await this.provider.getTemplates();
    return definitions
      .map((definition) => this.stripMandatoryProcessors(definition))
      .filter((item): item is AgentDefinition => item !== null);
  }

  async updateAgentDefinition(
    definitionId: string,
    data: AgentDefinitionUpdateInput,
  ): Promise<AgentDefinition> {
    const existing = await this.provider.getById(definitionId);
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
        case "systemPromptProcessorNames":
          nextValue = filterOptionalProcessorNames(value as string[], this.registries.systemPrompt);
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
        default:
          break;
      }

      updateRecord[key] = nextValue;
    }

    const updated = await this.provider.update(existing);
    logger.info(`Agent Definition with ID ${definitionId} updated successfully.`);
    return this.stripMandatoryProcessors(updated) ?? updated;
  }

  async deleteAgentDefinition(definitionId: string): Promise<boolean> {
    const existing = await this.provider.getById(definitionId);
    if (!existing) {
      throw new Error(`Agent Definition with ID ${definitionId} not found.`);
    }
    if (existing.ownershipScope !== "shared") {
      throw new Error("Deleting non-shared agent definitions is not supported.");
    }
    const success = await this.provider.delete(definitionId);
    if (success) {
      logger.info(`Agent Definition with ID ${definitionId} deleted successfully.`);
    } else {
      logger.warn(`Failed to delete agent definition with ID ${definitionId}.`);
    }
    return success;
  }

  async duplicateAgentDefinition(sourceId: string, newName: string): Promise<AgentDefinition> {
    const source = await this.provider.getById(sourceId);
    if (!source) {
      throw new Error(`Agent Definition with ID ${sourceId} not found.`);
    }
    if (source.ownershipScope !== "shared") {
      throw new Error("Duplicating non-shared agent definitions is not supported.");
    }
    const newId = this.nextAgentId(newName);
    const duplicated = await this.provider.duplicate(sourceId, newId, newName);
    logger.info(`Agent Definition duplicated from '${sourceId}' to '${duplicated.id}'.`);
    return this.stripMandatoryProcessors(duplicated) ?? duplicated;
  }

  async refreshCache(): Promise<void> {
    if (typeof this.provider.refresh === "function") {
      await this.provider.refresh();
    }
  }

  async refresh(): Promise<void> {
    return this.refreshCache();
  }
}
