import type { SkillNameConflict } from "./installed-skill-record.js";

export const SKILL_NAME_CONFLICT_CODE = "SKILL_NAME_CONFLICT";

/** Raised before an import, a new skill folder or a new skill would add a duplicate name (REQ-023). */
export class SkillNameConflictError extends Error {
  readonly code = SKILL_NAME_CONFLICT_CODE;

  constructor(readonly conflicts: SkillNameConflict[]) {
    super(`Duplicate skill names: ${[...new Set(conflicts.map((conflict) => conflict.name))].join(", ")}`);
    this.name = "SkillNameConflictError";
  }
}
