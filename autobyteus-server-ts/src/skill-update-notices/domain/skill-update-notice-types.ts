/** One skill folder's files (minus ignored ones) with their SHA-256 digests, keyed by relative path. */
export type SkillFolderSnapshot = Readonly<{
  skillName: string;
  skillDir: string;
  skillMdPath: string;
  files: Readonly<Record<string, string>>;
}>;

/** The last snapshot of each used skill a run was given, keyed by skill name. */
export type SeenSkillVersions = ReadonlyMap<string, SkillFolderSnapshot>;

/** What changed for one skill since a run last saw it. */
export type SkillChange =
  | Readonly<{ kind: "updated"; skillName: string; skillMdPath: string; changedFiles: readonly string[] }>
  | Readonly<{ kind: "removed"; skillName: string }>;

/** A skill as the catalog resolves it now. */
export type ResolvedSkill = Readonly<{ name: string; rootPath: string }>;
