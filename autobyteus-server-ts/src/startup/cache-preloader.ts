import { getMcpConfigService } from "../mcp-server-management/services/mcp-config-service.js";
import { getModelCatalogService } from "../llm-management/services/model-catalog-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export async function runCachePreloading(): Promise<void> {
  logger.info("Background cache pre-loading process has started.");
  const runtimeModelCatalogService = getModelCatalogService();

  try {
    const mcpService = getMcpConfigService();
    const configs = await mcpService.getAllMcpServers();
    logger.info(`Pre-loaded ${configs.length} MCP server configs into cache.`);
  } catch (error) {
    logger.error(`Failed to preload MCP server configs: ${String(error)}`);
  }

  try {
    const models = await runtimeModelCatalogService.listLlmModels();
    logger.info(`Pre-loaded ${models.length} LLM models into cache.`);
  } catch (error) {
    logger.error(`Failed to preload LLM models: ${String(error)}`);
  }

  try {
    const imageModels = await runtimeModelCatalogService.listImageModels();
    logger.info(`Pre-loaded ${imageModels.length} image models into cache.`);
  } catch (error) {
    logger.error(`Failed to preload image models: ${String(error)}`);
  }

  try {
    const audioModels = await runtimeModelCatalogService.listAudioModels();
    logger.info(`Pre-loaded ${audioModels.length} audio models into cache.`);
  } catch (error) {
    logger.error(`Failed to preload audio models: ${String(error)}`);
  }

  logger.info("Background application cache pre-loading completed.");
}
