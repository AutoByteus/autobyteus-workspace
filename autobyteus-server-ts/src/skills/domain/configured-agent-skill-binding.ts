import type { Skill } from "./models.js";

export type ConfiguredAgentSkillBinding =
  | { kind: "resolved"; skill: Skill }
  | { kind: "unresolved"; name: string };

export const collectResolvedConfiguredSkills = (
  bindings: readonly ConfiguredAgentSkillBinding[],
): Skill[] =>
  bindings.flatMap((binding) =>
    binding.kind === "resolved" ? [binding.skill] : []
  );
