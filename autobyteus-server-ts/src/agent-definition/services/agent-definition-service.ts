import {
  defaultInputProcessorRegistry,
  defaultLlmResponseProcessorRegistry,
  defaultSystemPromptProcessorRegistry,
  defaultToolExecutionResultProcessorRegistry,
  defaultToolInvocationPreprocessorRegistry,
  defaultLifecycleEventProcessorRegistry,
} from "autobyteus-ts";
import { AgentDefinition, AgentPromptMapping } from "../domain/models.js";
import { AgentDefinitionPersistenceProvider } from "../providers/agent-definition-persistence-provider.js";
import { AgentPromptMappingPersistenceProvider } from "../providers/agent-prompt-mapping-persistence-provider.js";
import { CachedAgentDefinitionProvider } from "../providers/cached-agent-definition-provider.js";
import { filterOptionalProcessorNames } from "../utils/processor-defaults.js";
import { PromptService } from "../../prompt-engineering/services/prompt-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
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
  update: (definition: AgentDefinition) => Promise<AgentDefinition>;
  delete: (id: string) => Promise<boolean>;
};

type AgentPromptMappingProvider = {
  getByAgentDefinitionId: (id: string) => Promise<AgentPromptMapping | null>;
  getByAgentDefinitionIds?: (ids: string[]) => Promise<Map<string, AgentPromptMapping>>;
  upsert: (mapping: AgentPromptMapping) => Promise<AgentPromptMapping>;
  deleteByAgentDefinitionId: (id: string) => Promise<boolean>;
};

type PromptServiceLike = {
  findAllByNameAndCategory: (
    name: string,
    category: string,
    suitableForModels?: string | null,
  ) => Promise<unknown[]>;
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
  role: string;
  description: string;
  avatarUrl?: string | null;
  systemPromptCategory: string;
  systemPromptName: string;
  toolNames?: string[];
  inputProcessorNames?: string[];
  llmResponseProcessorNames?: string[];
  systemPromptProcessorNames?: string[];
  toolExecutionResultProcessorNames?: string[];
  toolInvocationPreprocessorNames?: string[];
  lifecycleProcessorNames?: string[];
  skillNames?: string[];
};

export type AgentDefinitionUpdateInput = Partial<
  Omit<AgentDefinitionCreateInput, "systemPromptCategory" | "systemPromptName">
> & {
  systemPromptCategory?: string;
  systemPromptName?: string;
};

type AgentDefinitionServiceOptions = {
  provider?: AgentDefinitionProvider;
  persistenceProvider?: AgentDefinitionPersistenceProvider;
  mappingProvider?: AgentPromptMappingProvider;
  promptService?: PromptServiceLike;
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
  private mappingProvider: AgentPromptMappingProvider;
  private promptService: PromptServiceLike;
  private registries: ProcessorRegistries;

  constructor(options: AgentDefinitionServiceOptions = {}) {
    const persistenceProvider =
      options.persistenceProvider ?? new AgentDefinitionPersistenceProvider();
    this.provider = options.provider ?? new CachedAgentDefinitionProvider(persistenceProvider);
    this.mappingProvider =
      options.mappingProvider ?? new AgentPromptMappingPersistenceProvider();
    this.promptService = options.promptService ?? PromptService.getInstance();
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

  private async populateSystemPromptFields(
    definition: AgentDefinition | null,
  ): Promise<AgentDefinition | null> {
    if (!definition || !definition.id) {
      return definition;
    }
    const mapping = await this.mappingProvider.getByAgentDefinitionId(definition.id);
    if (mapping) {
      definition.systemPromptCategory = mapping.promptCategory;
      definition.systemPromptName = mapping.promptName;
    }
    return definition;
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

  async createAgentDefinition(data: AgentDefinitionCreateInput): Promise<AgentDefinition> {
    const requiredFields = [
      data.name,
      data.role,
      data.description,
      data.systemPromptCategory,
      data.systemPromptName,
    ];
    if (requiredFields.some((value) => !value)) {
      throw new Error("Missing required fields for agent definition creation.");
    }

    const promptMatches = await this.promptService.findAllByNameAndCategory(
      data.systemPromptName,
      data.systemPromptCategory,
    );
    if (!promptMatches || promptMatches.length === 0) {
      throw new Error(
        `Prompt family with name '${data.systemPromptName}' and category '${data.systemPromptCategory}' does not exist.`,
      );
    }

    const definition = new AgentDefinition({
      name: data.name,
      role: data.role,
      description: data.description,
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
    });

    const created = await this.provider.create(definition);
    logger.info(`Agent Definition created successfully with ID: ${String(created.id)}`);

    try {
      const mapping = new AgentPromptMapping({
        agentDefinitionId: created.id ?? "",
        promptName: data.systemPromptName,
        promptCategory: data.systemPromptCategory,
      });
      await this.mappingProvider.upsert(mapping);
      logger.info(
        `Set system prompt '${data.systemPromptCategory}/${data.systemPromptName}' for new agent definition '${String(created.id)}'.`,
      );
    } catch (error) {
      logger.error(
        `Failed to set system prompt mapping during agent definition creation for '${String(created.id)}': ${String(error)}`,
      );
      if (created.id) {
        await this.provider.delete(created.id);
      }
      throw new Error(`Failed to set system prompt, agent creation rolled back. Reason: ${String(error)}`);
    }

    created.systemPromptCategory = data.systemPromptCategory;
    created.systemPromptName = data.systemPromptName;
    return this.stripMandatoryProcessors(created) ?? created;
  }

  async getAgentDefinitionById(definitionId: string): Promise<AgentDefinition | null> {
    const definition = await this.provider.getById(definitionId);
    const populated = await this.populateSystemPromptFields(definition);
    return this.stripMandatoryProcessors(populated);
  }

  async getAllAgentDefinitions(): Promise<AgentDefinition[]> {
    const definitions = await this.provider.getAll();
    const definitionIds = definitions
      .map((definition) => definition.id)
      .filter((id): id is string => Boolean(id));
    const mappingByAgentDefinitionId = await this.getMappingsByAgentDefinitionIds(definitionIds);
    const result: AgentDefinition[] = [];
    for (const definition of definitions) {
      if (definition.id) {
        const mapping = mappingByAgentDefinitionId.get(definition.id);
        if (mapping) {
          definition.systemPromptCategory = mapping.promptCategory;
          definition.systemPromptName = mapping.promptName;
        }
      }
      const populated = definition;
      if (populated) {
        result.push(this.stripMandatoryProcessors(populated) ?? populated);
      }
    }
    return result;
  }

  private async getMappingsByAgentDefinitionIds(
    agentDefinitionIds: string[],
  ): Promise<Map<string, AgentPromptMapping>> {
    if (agentDefinitionIds.length === 0) {
      return new Map<string, AgentPromptMapping>();
    }
    if (this.mappingProvider.getByAgentDefinitionIds) {
      return this.mappingProvider.getByAgentDefinitionIds(agentDefinitionIds);
    }
    const mappingEntries = await Promise.all(
      agentDefinitionIds.map(async (id) => {
        const mapping = await this.mappingProvider.getByAgentDefinitionId(id);
        return [id, mapping] as const;
      }),
    );
    const mappingByAgentDefinitionId = new Map<string, AgentPromptMapping>();
    for (const [id, mapping] of mappingEntries) {
      if (mapping) {
        mappingByAgentDefinitionId.set(id, mapping);
      }
    }
    return mappingByAgentDefinitionId;
  }

  async updateAgentDefinition(
    definitionId: string,
    data: AgentDefinitionUpdateInput,
  ): Promise<AgentDefinition> {
    const existing = await this.provider.getById(definitionId);
    if (!existing) {
      throw new Error(`Agent Definition with ID ${definitionId} not found.`);
    }

    const strippedExisting = this.stripMandatoryProcessors(existing) ?? existing;

    const updateRecord = strippedExisting as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) {
        continue;
      }
      if (key === "systemPromptCategory" || key === "systemPromptName") {
        continue;
      }
      if (!(key in strippedExisting)) {
        continue;
      }

      let nextValue: unknown = value;
      switch (key) {
        case "inputProcessorNames":
          nextValue = filterOptionalProcessorNames(
            value as string[],
            this.registries.input,
          );
          break;
        case "llmResponseProcessorNames":
          nextValue = filterOptionalProcessorNames(
            value as string[],
            this.registries.llmResponse,
          );
          break;
        case "systemPromptProcessorNames":
          nextValue = filterOptionalProcessorNames(
            value as string[],
            this.registries.systemPrompt,
          );
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
          nextValue = filterOptionalProcessorNames(
            value as string[],
            this.registries.lifecycle,
          );
          break;
        case "avatarUrl":
          nextValue = normalizeOptionalString(value);
          break;
        default:
          break;
      }

      updateRecord[key] = nextValue;
    }

    const updated = await this.provider.update(strippedExisting);
    logger.info(`Agent Definition with ID ${definitionId} updated successfully.`);

    const systemPromptCategory = data.systemPromptCategory;
    const systemPromptName = data.systemPromptName;
    if (systemPromptCategory && systemPromptName) {
      const promptMatches = await this.promptService.findAllByNameAndCategory(
        systemPromptName,
        systemPromptCategory,
      );
      if (!promptMatches || promptMatches.length === 0) {
        throw new Error(
          `Prompt family with name '${systemPromptName}' and category '${systemPromptCategory}' does not exist.`,
        );
      }

      const mapping = new AgentPromptMapping({
        agentDefinitionId: updated.id ?? definitionId,
        promptName: systemPromptName,
        promptCategory: systemPromptCategory,
      });
      await this.mappingProvider.upsert(mapping);
      logger.info(
        `Updated system prompt for agent definition '${String(updated.id)}' to '${systemPromptCategory}/${systemPromptName}'.`,
      );
    }

    const populated = await this.populateSystemPromptFields(updated);
    return this.stripMandatoryProcessors(populated) ?? updated;
  }

  async deleteAgentDefinition(definitionId: string): Promise<boolean> {
    const existing = await this.provider.getById(definitionId);
    if (!existing) {
      throw new Error(`Agent Definition with ID ${definitionId} not found.`);
    }

    try {
      await this.mappingProvider.deleteByAgentDefinitionId(definitionId);
      logger.info(`Deleted prompt mapping for agent definition ${definitionId} before deletion.`);
    } catch (error) {
      logger.error(
        `Failed to delete prompt mapping for agent definition ${definitionId} before deletion: ${String(error)}`,
      );
    }

    const success = await this.provider.delete(definitionId);
    if (success) {
      logger.info(`Agent Definition with ID ${definitionId} deleted successfully.`);
    } else {
      logger.warn(`Failed to delete agent definition with ID ${definitionId}.`);
    }
    return success;
  }
}
