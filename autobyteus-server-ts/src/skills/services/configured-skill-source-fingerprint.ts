import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const inside = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

/** Content identity of the complete trusted configured-skill tree at resolution.
 * This does not replace the AGY materializer's no-follow copy and race checks.
 */
export const fingerprintConfiguredSkillSource = (source: string, trusted: string): string => {
  const sourceRoot = fs.realpathSync(source);
  const trustedRoot = fs.realpathSync(trusted);
  if (!inside(trustedRoot, sourceRoot) || !fs.lstatSync(source).isDirectory())
    throw new Error("CONFIGURED_SKILL_SOURCE_INVALID");
  const hash = createHash("sha256");
  const walk = (directory: string, relative: string): void => {
    for (const name of fs.readdirSync(directory).sort()) {
      const entry = path.join(directory, name);
      const entryRelative = path.join(relative, name);
      const stat = fs.lstatSync(entry);
      if (stat.isDirectory()) {
        hash.update(`directory:${entryRelative}\0`);
        walk(entry, entryRelative);
        continue;
      }
      if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error("CONFIGURED_SKILL_SOURCE_INVALID");
      const canonical = fs.realpathSync(entry);
      if (!inside(trustedRoot, canonical) || !fs.statSync(canonical).isFile())
        throw new Error("CONFIGURED_SKILL_SOURCE_INVALID");
      const targetStat = fs.statSync(canonical);
      if (targetStat.size > MAX_FILE_BYTES) throw new Error("CONFIGURED_SKILL_SOURCE_TOO_LARGE");
      const descriptor = fs.openSync(canonical, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      try {
        hash.update(`${stat.isSymbolicLink() ? "link" : "file"}:${entryRelative}\0`);
        if (stat.isSymbolicLink()) hash.update(`${fs.readlinkSync(entry)}\0`);
        hash.update(fs.readFileSync(descriptor));
      } finally { fs.closeSync(descriptor); }
    }
  };
  walk(sourceRoot, "");
  return hash.digest("hex");
};
