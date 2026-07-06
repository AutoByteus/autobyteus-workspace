import { SkillAccessMode, tool, ParameterSchema, BaseTool } from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { SkillService } from "../../skills/services/skill-service.js";
import { toJsonString } from "../json-utils.js";
import {
  resolveSkillToolAccessPolicy,
  type SkillToolContext,
} from "./skill-tool-access.js";

const DESCRIPTION = "Lists configured skills available to this agent with their descriptions.";

const argumentSchema = new ParameterSchema();

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export async function getAvailableSkills(
  context: SkillToolContext | null | undefined,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`get_available_skills tool invoked by agent run ${agentRunId}.`);

  try {
    const service = SkillService.getInstance();
    const policy = resolveSkillToolAccessPolicy(context);

    if (policy.mode === SkillAccessMode.NONE || policy.configuredSkillSet.size === 0) {
      return toJsonString([], 2);
    }

    const payload = Array.from(policy.configuredSkillSet)
      .map((skillName) => service.getSkill(skillName))
      .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill))
      .map((skill) => ({
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
