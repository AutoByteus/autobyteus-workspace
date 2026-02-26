import path from 'path';
import { tool } from '../functional-tool.js';
import type { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { SkillRegistry } from '../../skills/registry.js';
import { defaultToolRegistry } from '../registry/tool-registry.js';
import { SkillAccessMode, resolveSkillAccessMode } from '../../agent/context/skill-access-mode.js';

const DESCRIPTION = [
  "Loads a skill's entry point (SKILL.md) and provides its root path context.",
  'Use this to understand a specialized skill\'s capabilities and internal assets.',
  'Args: skill_name: The registered name of the skill or a path to a skill directory.',
  'Returns: A formatted context block containing the skill\'s map, its absolute root path, and path resolution guidance.'
].join(' ');

type SkillAwareContext = {
  config?: {
    skills?: string[];
    skillAccessMode?: SkillAccessMode | string;
  };
};

function looksLikePath(value: string): boolean {
  return path.isAbsolute(value) || value.includes('/') || value.includes('\\');
}

export async function loadSkill(context: SkillAwareContext | null | undefined, skill_name: string): Promise<string> {
  const registry = new SkillRegistry();
  const skillName = skill_name;
  const configuredSkills = context?.config?.skills ?? [];
  const configuredSkillSet = new Set(configuredSkills);
  const skillAccessMode = resolveSkillAccessMode(
    context?.config?.skillAccessMode,
    configuredSkills.length
  );

  if (skillAccessMode === SkillAccessMode.NONE) {
    throw new Error('Skill loading is disabled for this agent (skill access mode is NONE).');
  }

  if (skillAccessMode === SkillAccessMode.PRELOADED_ONLY && looksLikePath(skillName)) {
    throw new Error(
      `Skill '${skillName}' cannot be loaded by path when skill access mode is PRELOADED_ONLY.`
    );
  }

  if (skillAccessMode === SkillAccessMode.PRELOADED_ONLY && !configuredSkillSet.has(skillName)) {
    throw new Error(
      `Skill '${skillName}' is not preloaded for this agent and cannot be loaded in PRELOADED_ONLY mode.`
    );
  }

  let skill = registry.getSkill(skillName);

  if (!skill) {
    try {
      skill = registry.registerSkillFromPath(skillName);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Skill '${skillName}' not found and is not a valid skill path: ${message}`);
    }
  }

  if (
    skillAccessMode === SkillAccessMode.PRELOADED_ONLY &&
    !configuredSkillSet.has(skill.name)
  ) {
    throw new Error(
      `Skill '${skill.name}' is not preloaded for this agent and cannot be loaded in PRELOADED_ONLY mode.`
    );
  }

  return `## Skill: ${skill.name}\nRoot Path: ${skill.rootPath}\n\n> **CRITICAL: Path Resolution When Using Tools**\n> \n> This skill uses relative paths. When using any tool that requires a file path,\n> you MUST first construct the full absolute path by combining the Root Path above\n> with the relative path from the skill instructions.\n> \n> **Example:** Root Path + \`./scripts/format.sh\` = \`${skill.rootPath}/scripts/format.sh\`\n\n${skill.content}`;
}

const TOOL_NAME = 'load_skill';
let cachedTool: BaseTool | null = null;

export function registerLoadSkillTool(): BaseTool {
  if (!defaultToolRegistry.getToolDefinition(TOOL_NAME)) {
    cachedTool = tool({
      name: TOOL_NAME,
      description: DESCRIPTION,
      category: ToolCategory.GENERAL,
      paramNames: ['context', 'skill_name']
    })(loadSkill) as BaseTool;
    return cachedTool;
  }

  if (!cachedTool) {
    cachedTool = defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;
  }

  return cachedTool;
}
