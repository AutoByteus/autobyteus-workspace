/** One skill folder's files (minus ignored ones) with their SHA-256 digests, keyed by relative path. */
export type SkillFolderSnapshot = Readonly<{
  skillName: string;
  skillDir: string;
  skillMdPath: string;
  files: Readonly<Record<string, string>>;
}>;

/** The last snapshot of each used skill a run was given, keyed by skill name. */
export type SeenSkillVersions = ReadonlyMap<string, SkillFolderSnapshot>;

/** How one file of a skill differs from the version a run saw. */
export type SkillFileChangeStatus = "changed" | "added" | "removed";

/** One file of a skill that differs, by path relative to the skill folder. */
export type SkillFileChange = Readonly<{ path: string; status: SkillFileChangeStatus }>;

/**
 * What changed for one skill since a run last saw it: updated (its current folder and every file
 * that differs, `SKILL.md` first, then by path) or no longer available.
 */
export type SkillChange =
  | Readonly<{ kind: "updated"; skillName: string; skillDir: string; files: readonly SkillFileChange[] }>
  | Readonly<{ kind: "removed"; skillName: string }>;

/** A skill as the catalog resolves it now. */
export type ResolvedSkill = Readonly<{ name: string; rootPath: string }>;
