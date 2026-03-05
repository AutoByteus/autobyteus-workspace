import { promises as fs } from "node:fs";
import path from "node:path";
import { Prompt } from "../domain/models.js";
import { PromptService } from "../services/prompt-service.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";

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
    if (!agentDef) {
      logger.warn(`No agent definition found for id='${agentDefinitionId}'`);
      this.cache.set(cacheKey, null);
      return null;
    }

    const activePromptVersion = Number.isInteger(agentDef.activePromptVersion)
      && agentDef.activePromptVersion > 0
      ? agentDef.activePromptVersion
      : 1;
    const promptPath = path.join(
      appConfigProvider.config.getAppDataDir(),
      "agents",
      agentDefinitionId,
      `prompt-v${activePromptVersion}.md`,
    );
    try {
      const content = await fs.readFile(promptPath, "utf-8");
      this.cache.set(cacheKey, content);
      return content;
    } catch {
      logger.warn(
        `Prompt file not found for agent_definition_id='${agentDefinitionId}', version=${activePromptVersion}`,
      );
      this.cache.set(cacheKey, null);
      return null;
    }
  }

  private async findBestPromptForModel(
    prompts: Prompt[],
    _modelIdentifier: string,
  ): Promise<string | null> {
    if (prompts.length === 0) {
      logger.warn(`No active prompts available for model '${modelIdentifier}'.`);
      return null;
    }

    // With suitableForModels removed, all prompts are model-agnostic.
    // Return the first active prompt's content.
    const prompt = prompts[0]!;
    logger.debug(
      `Using prompt '${prompt.name}' (ID: ${String(prompt.id)}) for model '${modelIdentifier}'.`,
    );
    return prompt.promptContent;
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
