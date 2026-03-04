import { Prompt } from "../domain/models.js";
import { PromptService } from "../services/prompt-service.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

type PromptLoaderOptions = {
  promptService?: PromptService;
  agentDefinitionService?: AgentDefinitionService;
};

export class PromptLoader {
  private promptService: PromptService;
  private agentDefinitionService: AgentDefinitionService;
  private cache = new Map<string, string | null>();

  constructor(options: PromptLoaderOptions = {}) {
    this.promptService = options.promptService ?? new PromptService();
    this.agentDefinitionService =
      options.agentDefinitionService ?? AgentDefinitionService.getInstance();
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
      logger.warn(`No prompt mapping found for agent_definition_id='${agentDefinitionId}'`);
      this.cache.set(cacheKey, null);
      return null;
    }

    const activePrompts = await this.promptService.getActivePromptsByContext(
      agentDef.systemPromptName,
      agentDef.systemPromptCategory,
    );

    if (!activePrompts.length) {
      logger.warn(
        `No active prompts found for agent_definition_id='${agentDefinitionId}' in context (name=${agentDef.systemPromptName}, category=${agentDef.systemPromptCategory})`,
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
    _modelIdentifier: string,
  ): Promise<string | null> {
    if (prompts.length === 0) {
      logger.warn("No active prompts available for requested context.");
      return null;
    }

    const bestPrompt = prompts.reduce((current, candidate) => {
      const currentVersion = current.version ?? 0;
      const candidateVersion = candidate.version ?? 0;
      return candidateVersion > currentVersion ? candidate : current;
    });
    logger.debug(
      `Selected prompt '${bestPrompt.name}' (ID: ${String(bestPrompt.id)}) v${bestPrompt.version ?? "?"} as active template.`,
    );
    return bestPrompt.promptContent;
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
