import path from "node:path";
import {
  tool,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  BaseTool,
} from "autobyteus-ts";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
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

const findManagedSkillByPath = (service: SkillService, skillPath: string): Skill | null => {
  const resolvedPath = path.resolve(skillPath);
  return (
    service
      .listSkills()
      .find((skill) => path.resolve(skill.rootPath) === resolvedPath) ?? null
  );
};

const resolveManagedSkill = (
  service: SkillService,
  rawSkillName: string,
  policy: SkillToolAccessPolicy,
): Skill => {
  if (policy.mode === SkillAccessMode.PRELOADED_ONLY && looksLikePath(rawSkillName)) {
    throw new Error(
      `Skill '${rawSkillName}' cannot be loaded by path when skill access mode is PRELOADED_ONLY.`,
    );
  }

  if (
    policy.mode === SkillAccessMode.PRELOADED_ONLY &&
    !policy.configuredSkillSet.has(rawSkillName)
  ) {
    throw new Error(
      `Skill '${rawSkillName}' is not preloaded for this agent and cannot be loaded in PRELOADED_ONLY mode.`,
    );
  }

  if (looksLikePath(rawSkillName)) {
    const pathMatch = findManagedSkillByPath(service, rawSkillName);
    if (!pathMatch) {
      throw new Error(
        `Skill path '${rawSkillName}' is not a server-managed skill. Add the directory through normal skill sources/CRUD and load it by skill name.`,
      );
    }
    return pathMatch;
  }

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
    if (policy.mode === SkillAccessMode.NONE) {
      assertSkillAllowedByAccessPolicy(policy, skill_name);
    }

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
