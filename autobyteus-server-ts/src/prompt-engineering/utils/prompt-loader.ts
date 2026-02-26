import { Prompt } from "../domain/models.js";
import { PromptService } from "../services/prompt-service.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { LLMFactory } from "autobyteus-ts";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

type LlmFactoryLike = {
  getCanonicalName: (modelIdentifier: string) => Promise<string | null>;
};

type PromptLoaderOptions = {
  promptService?: PromptService;
  agentDefinitionService?: AgentDefinitionService;
  llmFactory?: LlmFactoryLike;
};

export class PromptLoader {
  static readonly DEFAULT_CANONICAL_MODEL = "default";

  private promptService: PromptService;
  private agentDefinitionService: AgentDefinitionService;
  private llmFactory: LlmFactoryLike;
  private cache = new Map<string, string | null>();

  constructor(options: PromptLoaderOptions = {}) {
    this.promptService = options.promptService ?? new PromptService();
    this.agentDefinitionService =
      options.agentDefinitionService ?? AgentDefinitionService.getInstance();
    this.llmFactory = options.llmFactory ?? LLMFactory;
  }

  async getPromptTemplate(
    promptName: string,
    category: string,
    modelIdentifier: string,
  ): Promise<string | null> {
    const cacheKey = `${promptName}:${category}:${modelIdentifier}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    const activePrompts = await this.promptService.getActivePromptsByContext(
      promptName,
      category,
    );
    const content = await this.findBestPromptForModel(activePrompts, modelIdentifier);
    this.cache.set(cacheKey, content ?? null);
    return content;
  }

  async getPromptTemplateForAgent(
    agentDefinitionId: string,
    modelIdentifier: string,
  ): Promise<string | null> {
    const cacheKey = `agent:${agentDefinitionId}:model:${modelIdentifier}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    const agentDef =
      await this.agentDefinitionService.getAgentDefinitionById(agentDefinitionId);
    if (!agentDef || !agentDef.systemPromptName || !agentDef.systemPromptCategory) {
      logger.warn(`No prompt mapping found for agent_id='${agentDefinitionId}'`);
      this.cache.set(cacheKey, null);
      return null;
    }

    const activePrompts = await this.promptService.getActivePromptsByContext(
      agentDef.systemPromptName,
      agentDef.systemPromptCategory,
    );

    if (!activePrompts.length) {
      logger.warn(
        `No active prompts found for agent_id='${agentDefinitionId}' in context (name=${agentDef.systemPromptName}, category=${agentDef.systemPromptCategory})`,
      );
      this.cache.set(cacheKey, null);
      return null;
    }

    const resultContent = await this.findBestPromptForModel(
      activePrompts,
      modelIdentifier,
    );
    this.cache.set(cacheKey, resultContent ?? null);
    return resultContent;
  }

  private async findBestPromptForModel(
    prompts: Prompt[],
    modelIdentifier: string,
  ): Promise<string | null> {
    const canonicalName = await this.llmFactory.getCanonicalName(modelIdentifier);
    if (!canonicalName) {
      logger.warn(`No canonical name found for model '${modelIdentifier}'.`);
      return null;
    }

    let primaryMatch: Prompt | null = null;
    let fallbackMatch: Prompt | null = null;

    for (const prompt of prompts) {
      if (!prompt.suitableForModels) {
        continue;
      }

      const suitableModels = new Set(
        prompt.suitableForModels
          .split(",")
          .map((model) => model.trim())
          .filter((model) => model.length > 0),
      );

      if (suitableModels.has(canonicalName)) {
        primaryMatch = prompt;
        break;
      }

      if (
        !fallbackMatch &&
        suitableModels.has(PromptLoader.DEFAULT_CANONICAL_MODEL)
      ) {
        fallbackMatch = prompt;
      }
    }

    if (primaryMatch) {
      logger.debug(
        `Found primary match prompt '${primaryMatch.name}' (ID: ${String(primaryMatch.id)}) suitable for model '${modelIdentifier}' (canonical: '${canonicalName}')`,
      );
      return primaryMatch.promptContent;
    }

    if (fallbackMatch) {
      logger.info(
        `No specific prompt for model '${modelIdentifier}' (canonical: '${canonicalName}'). Falling back to default model '${PromptLoader.DEFAULT_CANONICAL_MODEL}'. Using prompt '${fallbackMatch.name}' (ID: ${String(fallbackMatch.id)}).`,
      );
      return fallbackMatch.promptContent;
    }

    logger.warn(
      `Found ${prompts.length} active prompt(s), but none are suitable for model '${modelIdentifier}' (canonical: '${canonicalName}') or the default model '${PromptLoader.DEFAULT_CANONICAL_MODEL}'.`,
    );
    return null;
  }

  invalidateCache(): void {
    logger.info("Invalidating prompt template cache");
    this.cache.clear();
  }
}

let cachedPromptLoader: PromptLoader | null = null;

export const getPromptLoader = (): PromptLoader => {
  if (!cachedPromptLoader) {
    cachedPromptLoader = new PromptLoader();
  }
  return cachedPromptLoader;
};
