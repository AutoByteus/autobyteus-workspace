import path from "node:path";
import {
  tool,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  BaseTool,
} from "autobyteus-ts";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { Skill } from "../../skills/domain/models.js";
import { SkillService } from "../../skills/services/skill-service.js";
import {
  formatSkillInstructionsForPrompt,
  formatSkillPathResolutionGuidance,
} from "./skill-content-formatting.js";
import {
  assertSkillAllowedByAccessPolicy,
  resolveSkillToolAccessPolicy,
  type SkillToolAccessPolicy,
  type SkillToolContext,
} from "./skill-tool-access.js";

const DESCRIPTION = [
  "Loads a server-managed skill's entry point (SKILL.md) for runtime use.",
  "Returns the skill base path, path-resolution guidance, and formatted skill instructions.",
  "Rejects unmanaged arbitrary filesystem path loading; add skill folders through normal skill sources/CRUD instead.",
].join(" ");

const argumentSchema = new ParameterSchema();
argumentSchema.addParameter(
  new ParameterDefinition({
    name: "skill_name",
    type: ParameterType.STRING,
    description: "The registered name of the server-managed skill to load.",
    required: true,
  }),
);

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const looksLikePath = (value: string): boolean =>
  path.isAbsolute(value) || value.includes("/") || value.includes("\\");

const resolveManagedSkill = (
  service: SkillService,
  rawSkillName: string,
  policy: SkillToolAccessPolicy,
): Skill => {
  if (looksLikePath(rawSkillName)) {
    throw new Error(
      `Skill '${rawSkillName}' cannot be loaded by path. Load configured server-managed skills by registered skill name.`,
    );
  }

  assertSkillAllowedByAccessPolicy(policy, rawSkillName);

  const skill = service.getSkill(rawSkillName);
  if (!skill) {
    throw new Error(`Skill '${rawSkillName}' not found.`);
  }
  return skill;
};

export async function loadSkill(
  context: SkillToolContext | null | undefined,
  skill_name: string,
): Promise<string> {
  const agentRunId = context?.agentId ?? "unknown";
  logger.info(`load_skill tool invoked by agent run ${agentRunId} for skill '${skill_name}'.`);

  if (!skill_name) {
    throw new Error("skill_name is a required argument.");
  }

  try {
    const service = SkillService.getInstance();
    const policy = resolveSkillToolAccessPolicy(context);

    const skill = resolveManagedSkill(service, skill_name, policy);
    assertSkillAllowedByAccessPolicy(policy, skill.name);

    return `## Skill: ${skill.name}
Skill Base Path: ${skill.rootPath}

${formatSkillPathResolutionGuidance(skill.rootPath)}

${formatSkillInstructionsForPrompt(skill)}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to load skill '${skill_name}': ${message}`);
    throw new Error(message);
  }
}

const TOOL_NAME = "load_skill";
let cachedTool: BaseTool | null = null;

export function registerLoadSkillTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      argumentSchema,
      category: "Skills",
    })(loadSkill) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
