import type { Skill } from "./models.js";
import type { ConfiguredSkillSource } from "./configured-agent-skill-binding.js";

/**
 * One installed skill as discovered by the SkillService catalog, with the real
 * roots its layout implies. ALL_INSTALLED bindings are built from these records
 * directly; the skill is never re-resolved by name.
 *
 * - `global`: trusted root = the skill directory; configured root = the skills root it was found under.
 * - `agent_private` (`<root>/agents/<a>/skills/<n>`): trusted/configured root = `<root>/agents/<a>`.
 * - `agent_private` (`<root>/agent-teams/<t>/agents/<a>/skills/<n>`): trusted/configured root = `<root>/agent-teams/<t>`.
 * - `team_shared` (`<root>/agent-teams/<t>/skills/<n>`): trusted/configured root = `<root>/agent-teams/<t>`.
 */
export type InstalledSkillRecord = {
  skill: Skill;
  origin: ConfiguredSkillSource["origin"];
  trustedRoot: string;
  configuredRoot: string;
};
