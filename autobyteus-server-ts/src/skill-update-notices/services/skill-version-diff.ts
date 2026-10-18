import type { SkillChange, SkillFolderSnapshot } from "../domain/skill-update-notice-types.js";

/**
 * What changed for one skill between the version a run saw and the current one (null: nothing a
 * run needs to hear about). Files are compared by relative path and digest, so a skill that moved
 * to a new folder with the same files is unchanged, and one that moved with changes is "updated"
 * with its new path. A skill that no longer resolves is "removed" (when the run had seen it).
 */
export const diffSkillVersion = (
  skillName: string,
  seen: SkillFolderSnapshot | undefined,
  current: SkillFolderSnapshot | null,
): SkillChange | null => {
  if (!current) return seen ? Object.freeze({ kind: "removed", skillName }) : null;
  const changed = new Set<string>();
  const before = seen?.files ?? {};
  for (const [file, digest] of Object.entries(current.files)) {
    if (before[file] !== digest) changed.add(file);
  }
  for (const file of Object.keys(before)) {
    if (!(file in current.files)) changed.add(file);
  }
  if (changed.size === 0) return null;
  return Object.freeze({
    kind: "updated",
    skillName,
    skillMdPath: current.skillMdPath,
    changedFiles: Object.freeze([...changed].sort(compareChangedFiles)),
  });
};

/** `SKILL.md` first, then the other files by path. */
const compareChangedFiles = (a: string, b: string): number =>
  a === "SKILL.md" ? -1 : b === "SKILL.md" ? 1 : a.localeCompare(b);
