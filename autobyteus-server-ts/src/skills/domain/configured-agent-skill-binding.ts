import type { Skill } from "./models.js";

export type ConfiguredAgentSkillBinding =
  | { kind: "resolved"; skill: Skill; source: ConfiguredSkillSource }
  | { kind: "unresolved"; name: string };

/** Cause-certified AGY resolution; a legacy unresolved binding is not proof of absence. */
export type DetailedConfiguredSkillResolution =
  | { kind: "resolved"; skill: Skill; source: ConfiguredSkillSource; sourceTreeSha256: string }
  | { kind: "certified_absent"; name: string }
  | { kind: "invalid_candidate"; name: string; reason: "unsafe_name" | "present_invalid" };

/** The resolver's winning lookup branch, not a root guessed by a runtime adapter. */
export type ConfiguredSkillSource = Readonly<{
  origin: "agent_private" | "team_shared" | "global";
  sourceRoot: string;
  trustedRoot: string;
}>;

export const collectResolvedConfiguredSkills = (
  bindings: readonly ConfiguredAgentSkillBinding[],
): Skill[] =>
  bindings.flatMap((binding) =>
    binding.kind === "resolved" ? [binding.skill] : []
  );
