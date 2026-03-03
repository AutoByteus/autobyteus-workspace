import { tool, ParameterSchema, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { SkillService } from "../../skills/services/skill-service.js";
import { toJsonString } from "../json-utils.js";

const DESCRIPTION = "Lists all available skills with their descriptions.";

const argumentSchema = new ParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = {
  // Core boundary from autobyteus-ts runtime; normalize immediately to `agentRunId` in local code.
  agentId?: string;
};

export async function getAvailableSkills(context: AgentContextLike): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`get_available_skills tool invoked by agent run ${agentRunId}.`);

  try {
    const service = SkillService.getInstance();
    const skills = service.listSkills();
    const payload = skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
    }));
    return toJsonString(payload, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to list available skills: ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "get_available_skills";
let cachedTool: BaseTool | null = null;

export function registerGetAvailableSkillsTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Skills",
    })(getAvailableSkills) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
