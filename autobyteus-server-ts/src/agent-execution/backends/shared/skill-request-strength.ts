import type { AgentSkillScope } from "../../../agent-definition/domain/models.js";

/**
 * How firmly a run asks for its workspace skill paths (D-15).
 * - `configured` (strong): the agent names these skills; path conflicts fail fast.
 * - `all_installed` (weak): the agent takes every installed skill; it yields to a user-owned
 *   workspace entry, to another run's holder, and to a configured request.
 */
export type SkillRequestStrength = "configured" | "all_installed";

/** Maps the scope resolved by `SkillService.resolveSkillScope` to a request strength. */
export const skillRequestStrengthForScope = (scope: AgentSkillScope): SkillRequestStrength =>
  scope === "ALL_INSTALLED" ? "all_installed" : "configured";

export const isWeakSkillRequest = (strength: SkillRequestStrength | null | undefined): boolean =>
  strength === "all_installed";
