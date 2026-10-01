import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The skill folders that coding runtimes read on their own (D-19 tier 4). If the user adds one of
 * them as a skill folder, its skills only fill names that tiers 1–3 do not provide.
 */
export const listRuntimeDefaultSkillFolders = (
  env: NodeJS.ProcessEnv = process.env,
  homeDir: string = os.homedir(),
): string[] => [
  path.join(env.CODEX_HOME?.trim() || path.join(homeDir, ".codex"), "skills"),
  path.join(homeDir, ".claude", "skills"),
  path.join(homeDir, ".agents", "skills"),
  path.join(homeDir, ".grok", "skills"),
];

const canonicalPath = (directory: string): string => {
  try {
    return fs.realpathSync(directory);
  } catch {
    return path.resolve(directory);
  }
};

/** Matches a folder against the runtime default folders by realpath equality. */
export const createRuntimeDefaultSkillFolderMatcher = (
  folders: readonly string[] = listRuntimeDefaultSkillFolders(),
): ((directory: string) => boolean) => {
  return (directory) => {
    const candidate = canonicalPath(directory);
    return folders.some((folder) => canonicalPath(folder) === candidate);
  };
};
