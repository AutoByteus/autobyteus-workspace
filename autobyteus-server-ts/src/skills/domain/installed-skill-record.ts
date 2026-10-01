import type { Skill } from "./models.js";

/**
 * Catalog precedence tier of a skill source (D-19). A lower tier wins for a name:
 * 1. AutoByteus's own skills folder.
 * 2. Definition-root bundles: the app data dir, then the agent package roots, in order.
 * 3. Added skill folders that are not runtime default folders, in Settings order.
 * 4. Runtime default skill folders (e.g. `~/.codex/skills`), only if added; they never win over 1–3.
 */
export type SkillCatalogTier = 1 | 2 | 3 | 4;

/**
 * One installed skill as discovered by the SkillService catalog. Every run and every
 * name-based operation uses this record; the skill is never re-resolved by name elsewhere.
 *
 * `sourcePath` is the catalog source (skills folder, definition root or added folder) and
 * `tier` its precedence tier.
 */
export type InstalledSkillRecord = {
  skill: Skill;
  tier: SkillCatalogTier;
  sourcePath: string;
};

/** A skill folder found by a layout scan, before the catalog assigns its source and tier. */
export type DiscoveredSkillRecord = Omit<InstalledSkillRecord, "tier" | "sourcePath">;

/**
 * Copies of a name that the catalog ignores (REQ-024). `conflict`: the ignored copies are in
 * tiers 1–3 and the user should fix them; `shadowed_runtime_default`: the ignored copies are in
 * a runtime default folder (informational).
 */
export type SkillNameIssue = {
  name: string;
  usedPath: string;
  ignoredPaths: string[];
  kind: "conflict" | "shadowed_runtime_default";
};

/** An incoming skill whose name already exists in tiers 1–3 (REQ-023). */
export type SkillNameConflict = { name: string; existingPath: string; incomingPath: string };

/** A same-name pair where the runtime default copy is ignored (tier 4; not an error). */
export type SkillNameNotice = { name: string; usedPath: string; ignoredPath: string };

export type SkillNameValidation = { conflicts: SkillNameConflict[]; notices: SkillNameNotice[] };
