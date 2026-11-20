/**
 * The skill rule (contract §5): a plain read of one `SKILL.md` file inside a skills folder is a
 * skill load, whichever runtime or tool did the read. It works on the neutral command every
 * runtime table already produces (`cat`, `cat -n`, `sed -n`, `head`), so it exists once.
 */

import { plainReadPath } from "./plain-read.js";

const isSkillsFolder = (name: string): boolean => name.endsWith("skills");

/** `<skills folder>/<name>/SKILL.md`, or `<skills folder>/.system/<name>/SKILL.md`. */
const skillNameOfPath = (path: string): string | null => {
  const parts = path.split("/").filter((part) => part.length > 0);
  if (parts.length < 3 || parts[parts.length - 1] !== "SKILL.md") return null;
  const name = parts[parts.length - 2]!;
  const folder = parts[parts.length - 3]!;
  const underSystem = folder === ".system" && parts.length >= 4 && isSkillsFolder(parts[parts.length - 4]!);
  return name.length > 0 && (isSkillsFolder(folder) || underSystem) ? name : null;
};

/** The skill a command loads, or null when the command is not a plain read of a skill file. */
export const skillNameOfPlainRead = (command: string): string | null => {
  const path = plainReadPath(command);
  return path === null ? null : skillNameOfPath(path);
};
