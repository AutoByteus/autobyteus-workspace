import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const inside = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

const walkConfiguredSkillSource = (
  source: string, trusted: string,
  onFile: (entry: string, relative: string, stat: fs.Stats, canonical: string) => void,
  onDirectory?: (relative: string) => void,
): void => {
  const sourceRoot = fs.realpathSync(source);
  const trustedRoot = fs.realpathSync(trusted);
  if (!inside(trustedRoot, sourceRoot) || !fs.lstatSync(source).isDirectory())
    throw new Error("CONFIGURED_SKILL_SOURCE_INVALID");
  const walk = (directory: string, relative: string): void => {
    for (const name of fs.readdirSync(directory).sort()) {
      const entry = path.join(directory, name);
      const entryRelative = path.join(relative, name);
      const stat = fs.lstatSync(entry);
      if (stat.isDirectory()) {
        onDirectory?.(entryRelative);
        walk(entry, entryRelative);
        continue;
      }
      if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error("CONFIGURED_SKILL_SOURCE_INVALID");
      const canonical = fs.realpathSync(entry);
      if (!inside(trustedRoot, canonical) || !fs.statSync(canonical).isFile())
        throw new Error("CONFIGURED_SKILL_SOURCE_INVALID");
      const targetStat = fs.statSync(canonical);
      if (targetStat.size > MAX_FILE_BYTES) throw new Error("CONFIGURED_SKILL_SOURCE_TOO_LARGE");
      onFile(entry, entryRelative, stat, canonical);
    }
  };
  walk(sourceRoot, "");
};

/** Inspect provenance and size before treating manifest content as skippable. */
export const assertConfiguredSkillSourceSafety = (source: string, trusted: string): void => {
  walkConfiguredSkillSource(source, trusted, () => undefined);
};

/** Content identity of the complete trusted configured-skill tree at resolution.
 * This does not replace the AGY materializer's no-follow copy and race checks.
 */
export const fingerprintConfiguredSkillSource = (source: string, trusted: string): string => {
  const hash = createHash("sha256");
  walkConfiguredSkillSource(source, trusted, (entry, relative, stat, canonical) => {
    const descriptor = fs.openSync(canonical, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      hash.update(`${stat.isSymbolicLink() ? "link" : "file"}:${relative}\0`);
      if (stat.isSymbolicLink()) hash.update(`${fs.readlinkSync(entry)}\0`);
      hash.update(fs.readFileSync(descriptor));
    } finally { fs.closeSync(descriptor); }
  }, (relative) => hash.update(`directory:${relative}\0`));
  return hash.digest("hex");
};
