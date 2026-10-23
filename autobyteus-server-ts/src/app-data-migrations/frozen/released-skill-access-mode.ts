// Historical, migration-only. The run-level skill access mode was removed from the current runtime;
// these are the values released app-data shapes carried at the time of removal.
// Owned by released app-data migrations; current runtime must not import it.
export const RELEASED_SKILL_ACCESS_MODES = ["PRELOADED_ONLY", "NONE"] as const;

export type ReleasedSkillAccessMode = (typeof RELEASED_SKILL_ACCESS_MODES)[number];

export const isReleasedSkillAccessMode = (value: unknown): value is ReleasedSkillAccessMode =>
  (RELEASED_SKILL_ACCESS_MODES as readonly unknown[]).includes(value);
