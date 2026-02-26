import { getMcpConfigService } from "../mcp-server-management/services/mcp-config-service.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export async function runMcpToolRegistration(): Promise<void> {
  logger.info("Running MCP tool registration background task...");
  try {
    await getMcpConfigService().loadAllAndRegister();
  } catch (error) {
    logger.error(`MCP tool registration failed: ${String(error)}`);
    throw error;
  }
}
