import type { RuntimeSkillProfile } from "./shared/runtime-skill-profile.js";

/** Bootstrap resources belong to the enclosing concrete factory from acquisition onward. */
export interface ProviderPreparationGuard {
  assertAccepting(): void;
  ownSkillProfile?(profile: RuntimeSkillProfile): void;
}
