import type { SkillChange, SkillFileChange, SkillFolderSnapshot } from "../domain/skill-update-notice-types.js";

/**
 * What changed for one skill between the version a run saw and the current one (null: nothing a
 * run needs to hear about). Files are compared by relative path and digest, so a skill that moved
 * to a new folder with the same files is unchanged, and one that moved with changes is "updated"
 * with its new folder. Each differing file is "changed", "added" or "removed". A skill that no
 * longer resolves is "removed" (when the run had seen it).
 */
export const diffSkillVersion = (
  skillName: string,
  seen: SkillFolderSnapshot | undefined,
  current: SkillFolderSnapshot | null,
): SkillChange | null => {
  if (!current) return seen ? Object.freeze({ kind: "removed", skillName }) : null;
  const before = seen?.files ?? {};
  const files: SkillFileChange[] = [];
  for (const [file, digest] of Object.entries(current.files)) {
    if (!(file in before)) files.push(Object.freeze({ path: file, status: "added" }));
    else if (before[file] !== digest) files.push(Object.freeze({ path: file, status: "changed" }));
  }
  for (const file of Object.keys(before)) {
    if (!(file in current.files)) files.push(Object.freeze({ path: file, status: "removed" }));
  }
  if (files.length === 0) return null;
  return Object.freeze({
    kind: "updated",
    skillName,
    skillDir: current.skillDir,
    files: Object.freeze(files.sort((a, b) => compareChangedFiles(a.path, b.path))),
  });
};

/** `SKILL.md` first, then the other files by path. */
const compareChangedFiles = (a: string, b: string): number =>
  a === "SKILL.md" ? -1 : b === "SKILL.md" ? 1 : a.localeCompare(b);
