import {
  SkillAccessMode,
  resolveSkillAccessMode,
} from "autobyteus-ts/agent/context/skill-access-mode.js";

type SkillToolContextConfig = {
  skills?: string[];
  skillAccessMode?: SkillAccessMode | string | null;
};

export type SkillToolContext = {
  // Core boundary from autobyteus-ts runtime; normalize immediately to `agentRunId` in local code.
  agentId?: string;
  config?: SkillToolContextConfig | null;
};

export type SkillToolAccessPolicy = {
  mode: SkillAccessMode;
  configuredSkillSet: Set<string>;
};

const normalizeConfiguredSkillNames = (
  configuredSkills: string[] | null | undefined,
): string[] =>
  (configuredSkills ?? [])
    .map((skillName) => (typeof skillName === "string" ? skillName.trim() : ""))
    .filter((skillName) => skillName.length > 0);

export function resolveSkillToolAccessPolicy(
  context: SkillToolContext | null | undefined,
): SkillToolAccessPolicy {
  const configuredSkillNames = normalizeConfiguredSkillNames(context?.config?.skills);
  return {
    mode: resolveSkillAccessMode(
      context?.config?.skillAccessMode,
      configuredSkillNames.length,
    ),
    configuredSkillSet: new Set(configuredSkillNames),
  };
}

export function assertSkillAllowedByAccessPolicy(
  policy: SkillToolAccessPolicy,
  skillName: string,
): void {
  if (policy.mode === SkillAccessMode.NONE) {
    throw new Error("Skill access is disabled for this agent (skill access mode is NONE).");
  }

  if (
    policy.mode === SkillAccessMode.PRELOADED_ONLY &&
    !policy.configuredSkillSet.has(skillName)
  ) {
    throw new Error(
      `Skill '${skillName}' is not preloaded for this agent and cannot be loaded in PRELOADED_ONLY mode.`,
    );
  }
}
