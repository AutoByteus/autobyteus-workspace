import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";

export type ResolvedRuntimeSkill = {
  name: string;
  description: string;
  content: string;
  rootPath: string;
  skillFilePath: string;
};

const normalizeConfiguredSkills = (
  configuredSkills: ResolvedRuntimeSkill[] | null | undefined,
): ResolvedRuntimeSkill[] => configuredSkills ?? [];

export const resolveEnabledConfiguredRuntimeSkills = (options: {
  configuredSkills?: ResolvedRuntimeSkill[] | null;
  skillAccessMode?: SkillAccessMode | null;
}): ResolvedRuntimeSkill[] => {
  if (options.skillAccessMode === SkillAccessMode.NONE) {
    return [];
  }
  return normalizeConfiguredSkills(options.configuredSkills);
};

const resolveAvailabilityLine = (skillAccessMode: SkillAccessMode | null | undefined): string =>
  skillAccessMode === SkillAccessMode.PRELOADED_ONLY
    ? "Only the agent-configured skills below are available for this run."
    : "The agent-configured skills below are preloaded for this run.";

export const renderConfiguredSkillInstructionBlock = (options: {
  configuredSkills?: ResolvedRuntimeSkill[] | null;
  skillAccessMode?: SkillAccessMode | null;
}): string | null => {
  const configuredSkills = resolveEnabledConfiguredRuntimeSkills(options);
  if (configuredSkills.length === 0) {
    return null;
  }

  const lines: string[] = [
    "## Agent Configured Skills",
    resolveAvailabilityLine(options.skillAccessMode),
    "",
    "### Path Resolution Rule",
    "When a skill references a relative path such as `./scripts/run.sh`, resolve it against that skill's `Root Path`, not the workspace root.",
    "",
  ];

  for (const skill of configuredSkills) {
    lines.push(`### ${skill.name}`);
    if (skill.description.trim()) {
      lines.push(`Description: ${skill.description.trim()}`);
    }
    lines.push(`Root Path: \`${skill.rootPath}\``);
    lines.push("");
    lines.push(skill.content.trim());
    lines.push("");
  }

  return lines.join("\n").trim();
};

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const toCodexDisplayName = (skillName: string): string => {
  const normalized = collapseWhitespace(skillName.replace(/[-_]+/g, " "));
  if (!normalized) {
    return "Configured Skill";
  }
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const renderCodexWorkspaceSkillOpenAiYaml = (
  skill: ResolvedRuntimeSkill,
): string => {
  const shortDescription =
    collapseWhitespace(skill.description) || "Agent-configured skill for this run.";
  const defaultPrompt = `Use $${skill.name} when the request matches this skill. Follow the instructions in SKILL.md.`;

  return [
    "interface:",
    `  display_name: ${JSON.stringify(toCodexDisplayName(skill.name))}`,
    `  short_description: ${JSON.stringify(shortDescription)}`,
    `  default_prompt: ${JSON.stringify(defaultPrompt)}`,
  ].join("\n");
};
