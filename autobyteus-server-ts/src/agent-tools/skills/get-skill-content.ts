import {
  tool,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  BaseTool,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { TreeNode } from "../../file-explorer/tree-node.js";
import { SkillService } from "../../skills/services/skill-service.js";

const DESCRIPTION =
  "Retrieves a skill's instructions (SKILL.md) and a readable file tree listing.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "skill_name",
    type: ParameterType.STRING,
    description: "The name of the skill to retrieve.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

const serializeTree = (node: TreeNode, prefix = ""): string => {
  const label = node.isFile ? node.name : `${node.name}/`;
  const output = [`${prefix}${label}`];
  for (const child of node.children) {
    output.push(serializeTree(child, `${prefix}  `));
  }
  return output.join("\n");
};

export async function getSkillContent(
  context: AgentContextLike,
  skill_name: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(`get_skill_content tool invoked by agent ${agentId} for skill '${skill_name}'.`);

  if (!skill_name) {
    throw new Error("skill_name is a required argument.");
  }

  try {
    const service = SkillService.getInstance();
    const skill = service.getSkill(skill_name);
    if (!skill) {
      throw new Error(`Skill '${skill_name}' not found.`);
    }

    let filesStr = "";
    try {
      const tree = await service.getSkillFileTree(skill_name);
      filesStr = serializeTree(tree);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to build skill file tree: ${message}`);
      filesStr = `Error listing files: ${message}`;
    }

    return `# Skill: ${skill.name}

## Description
${skill.description}

## Instructions (SKILL.md)
${skill.content}

## File Structure
${filesStr}
`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get content for skill '${skill_name}': ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "get_skill_content";
let cachedTool: BaseTool | null = null;

export function registerGetSkillContentTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Skills",
    })(getSkillContent) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
