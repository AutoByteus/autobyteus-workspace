import type { Skill } from "./models.js";

export type ConfiguredAgentSkillBinding =
  | { kind: "resolved"; skill: Skill; source: ConfiguredSkillSource }
  | { kind: "unresolved"; name: string };

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
