import {
  tool,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  BaseTool,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { SkillService } from "../../skills/services/skill-service.js";
import { SkillVersioningService } from "../../skills/services/skill-versioning-service.js";

const DESCRIPTION =
  "Creates a new version (git tag) for a skill after changes are complete.";

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "skill_name",
    type: ParameterType.STRING,
    description: "The name of the skill to version.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "version_tag",
    type: ParameterType.STRING,
    description: "Semantic version tag (e.g., '1.0.1'). Must be unique.",
    required: true,
  }),
);
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "message",
    type: ParameterType.STRING,
    description: "Description of the changes in this version.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AgentContextLike = { agentId?: string };

export async function createSkillVersion(
  context: AgentContextLike,
  skill_name: string,
  version_tag: string,
  message: string,
): Promise<string> {
  const agentId = context?.agentId ?? "unknown";
  logger.info(
    `create_skill_version tool invoked by agent ${agentId} for skill '${skill_name}'.`,
  );

  const skillService = SkillService.getInstance();
  const versioningService = SkillVersioningService.getInstance();

  const skill = skillService.getSkill(skill_name);
  if (!skill) {
    throw new Error(`Skill '${skill_name}' not found.`);
  }

  if (!versioningService.isVersioned(skill.rootPath)) {
    throw new Error(
      `Skill '${skill_name}' is not versioned. Please enable versioning for this skill first.`,
    );
  }

  try {
    const version = versioningService.createVersion(skill.rootPath, version_tag, message);
    return `Success: Created version ${version.tag} for skill '${skill_name}'. Commit: ${version.commitHash}`;
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    let details = messageText;
    if (messageText.includes("already exists")) {
      try {
        const versions = versioningService.listVersions(skill.rootPath);
        const versionList = versions.slice(0, 5).map((version) => version.tag).join(", ");
        if (versionList) {
          details = `${messageText}. Existing versions: ${versionList}...`;
        }
      } catch (innerError) {
        logger.warn(`Failed to list versions after duplicate tag: ${String(innerError)}`);
      }
    }
    logger.error(`Failed to create skill version: ${details}`);
    throw new Error(`Error: Failed to create version. ${details}`);
  }
}

const TOOL_NAME = "create_skill_version";
let cachedTool: BaseTool | null = null;

export function registerCreateSkillVersionTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Skill Management",
    })(createSkillVersion) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
