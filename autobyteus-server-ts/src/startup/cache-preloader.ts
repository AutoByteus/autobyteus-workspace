import { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../agent-team-definition/services/agent-team-definition-service.js";
import { getMcpConfigService } from "../mcp-server-management/services/mcp-config-service.js";
import { PromptService } from "../prompt-engineering/services/prompt-service.js";
import { getLlmModelService } from "../llm-management/services/llm-model-service.js";
import { getImageModelService } from "../multimedia-management/services/image-model-service.js";
import { getAudioModelService } from "../multimedia-management/services/audio-model-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export async function runCachePreloading(): Promise<void> {
  logger.info("Background cache pre-loading process has started.");

  try {
    const agentDefService = AgentDefinitionService.getInstance();
    const definitions = await agentDefService.getAllAgentDefinitions();
    logger.info(`Pre-loaded ${definitions.length} agent definitions into cache.`);
  } catch (error) {
    logger.error(`Failed to preload agent definitions: ${String(error)}`);
  }

  try {
    const teamDefService = AgentTeamDefinitionService.getInstance();
    const teamDefinitions = await teamDefService.getAllDefinitions();
    logger.info(`Pre-loaded ${teamDefinitions.length} agent team definitions into cache.`);
  } catch (error) {
    logger.error(`Failed to preload agent team definitions: ${String(error)}`);
  }

  try {
    const mcpService = getMcpConfigService();
    const configs = await mcpService.getAllMcpServers();
    logger.info(`Pre-loaded ${configs.length} MCP server configs into cache.`);
  } catch (error) {
    logger.error(`Failed to preload MCP server configs: ${String(error)}`);
  }

  try {
    const promptService = new PromptService();
    const prompts = await promptService.findPrompts();
    logger.info(`Pre-loaded ${prompts.length} prompts into cache.`);
  } catch (error) {
    logger.error(`Failed to preload prompts: ${String(error)}`);
  }

  try {
    const models = await getLlmModelService().getAvailableModels();
    logger.info(`Pre-loaded ${models.length} LLM models into cache.`);
  } catch (error) {
    logger.error(`Failed to preload LLM models: ${String(error)}`);
  }

  try {
    const imageModels = await getImageModelService().getAvailableModels();
    logger.info(`Pre-loaded ${imageModels.length} image models into cache.`);
  } catch (error) {
    logger.error(`Failed to preload image models: ${String(error)}`);
  }

  try {
    const audioModels = await getAudioModelService().getAvailableModels();
    logger.info(`Pre-loaded ${audioModels.length} audio models into cache.`);
  } catch (error) {
    logger.error(`Failed to preload audio models: ${String(error)}`);
  }

  logger.info("Background application cache pre-loading completed.");
}
