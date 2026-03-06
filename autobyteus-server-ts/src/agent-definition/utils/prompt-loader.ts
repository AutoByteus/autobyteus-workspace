import { promises as fs } from "node:fs";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { parseAgentMd } from "./agent-md-parser.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class PromptLoader {
  async getPromptTemplateForAgent(agentId: string): Promise<string | null> {
    const mdPath = appConfigProvider.config.getAgentMdPath(agentId);
    try {
      const content = await fs.readFile(mdPath, "utf-8");
      const { instructions } = parseAgentMd(content, mdPath);
      return instructions;
    } catch {
      logger.warn(`Prompt file not found or unreadable for agent_definition_id='${agentId}'`);
      return null;
    }
  }
}

export const promptLoader = new PromptLoader();
