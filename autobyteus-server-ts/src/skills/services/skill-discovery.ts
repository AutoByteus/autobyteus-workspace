import fs from "node:fs";
import path from "node:path";
import type { InstalledSkillRecord } from "../domain/installed-skill-record.js";
import { SkillLoader } from "../loader.js";

type SkillDirectoryConfig = {
  getSkillsDir(): string;
  getAdditionalSkillsDirs(): string[];
};

type DefinitionRootConfig = {
  getAppDataDir(): string;
  getAdditionalAgentPackageRoots(): string[];
  getAdditionalSkillsDirs?(): string[];
};

type SkillDiscoveryDependencies = {
  loader: SkillLoader;
  isReadonlyPath: (skillPath: string) => boolean;
  logger: {
    warn: (...args: unknown[]) => void;
  };
};

export const isSkillDirectory = (directory: string): boolean =>
  fs.existsSync(path.join(directory, "SKILL.md"));

const isExistingDirectory = (directory: string): boolean => {
  try {
    return fs.statSync(directory).isDirectory();
  } catch {
    return false;
  }
};

const readSortedDirectoryEntries = (directory: string): fs.Dirent[] => {
  if (!isExistingDirectory(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((first, second) => first.name.localeCompare(second.name));
};

export const getAllDefinitionRoots = (config: DefinitionRootConfig): string[] => {
  const roots = [
    config.getAppDataDir(),
    ...config.getAdditionalAgentPackageRoots(),
    ...(config.getAdditionalSkillsDirs?.() ?? []),
  ];
  const seen = new Set<string>();

  return roots.filter((root) => {
    const resolved = path.resolve(root);
    if (seen.has(resolved)) {
      return false;
    }
    seen.add(resolved);
    return true;
  });
};

export const getAllSkillDirectories = (config: SkillDirectoryConfig): string[] => [
  config.getSkillsDir(),
  ...config.getAdditionalSkillsDirs(),
];

const getSkillFolderDirectories = (skillsDir: string): string[] => {
  const skillDirectories: string[] = [];

  for (const entry of readSortedDirectoryEntries(skillsDir)) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillDir = path.join(skillsDir, entry.name);
    if (isSkillDirectory(skillDir)) {
      skillDirectories.push(skillDir);
    }
  }

  return skillDirectories;
};

type BundledSkillLocation = {
  path: string;
  origin: "agent_private" | "team_shared";
  /** Trusted and configured root implied by the layout. */
  root: string;
};

const getAgentSkillLocations = (
  agentsDir: string,
  rootForAgent: (agentDir: string) => string,
): BundledSkillLocation[] => {
  const locations: BundledSkillLocation[] = [];

  for (const agentEntry of readSortedDirectoryEntries(agentsDir)) {
    if (!agentEntry.isDirectory()) {
      continue;
    }

    const agentDir = path.join(agentsDir, agentEntry.name);
    const root = rootForAgent(agentDir);
    for (const skillDir of getSkillFolderDirectories(path.join(agentDir, "skills"))) {
      locations.push({ path: skillDir, origin: "agent_private", root });
    }
  }

  return locations;
};

const getBundledSkillLocationsFromDefinitionRoot = (
  definitionRoot: string,
): BundledSkillLocation[] => {
  const locations = getAgentSkillLocations(
    path.join(definitionRoot, "agents"),
    (agentDir) => agentDir,
  );

  const teamRoots = path.join(definitionRoot, "agent-teams");
  for (const teamEntry of readSortedDirectoryEntries(teamRoots)) {
    if (!teamEntry.isDirectory()) {
      continue;
    }

    const teamDir = path.join(teamRoots, teamEntry.name);
    locations.push(
      ...getAgentSkillLocations(path.join(teamDir, "agents"), () => teamDir),
      ...getSkillFolderDirectories(path.join(teamDir, "skills")).map((skillDir) => ({
        path: skillDir,
        origin: "team_shared" as const,
        root: teamDir,
      })),
    );
  }

  return locations;
};

export const scanBundledSkillsFromDefinitionRoot = (
  definitionRoot: string,
  dependencies: SkillDiscoveryDependencies,
): InstalledSkillRecord[] => {
  const records: InstalledSkillRecord[] = [];

  for (const location of getBundledSkillLocationsFromDefinitionRoot(definitionRoot)) {
    try {
      const skill = dependencies.loader.loadSkill(
        location.path,
        dependencies.isReadonlyPath(location.path),
      );
      records.push({
        skill,
        origin: location.origin,
        trustedRoot: path.resolve(location.root),
        configuredRoot: path.resolve(location.root),
      });
    } catch (error) {
      dependencies.logger.warn(
        `Error loading bundled skill at ${location.path}: ${String(error)}`,
      );
    }
  }

  return records;
};

export const searchBundledSkillDirectory = (
  definitionRoot: string,
  name: string,
  dependencies: SkillDiscoveryDependencies,
): string | null => {
  for (const { path: skillDir } of getBundledSkillLocationsFromDefinitionRoot(definitionRoot)) {
    try {
      const skill = dependencies.loader.loadSkill(
        skillDir,
        dependencies.isReadonlyPath(skillDir),
      );
      if (skill.name === name) {
        return skillDir;
      }
    } catch (error) {
      dependencies.logger.warn(
        `Error loading bundled skill at ${skillDir}: ${String(error)}`,
      );
    }
  }

  return null;
};

export const searchDirectoryRecursive = (
  directory: string,
  name: string,
): string | null => {
  if (!fs.existsSync(directory)) {
    return null;
  }

  const candidate = path.join(directory, name);
  if (fs.existsSync(candidate) && isSkillDirectory(candidate)) {
    return candidate;
  }

  const nestedSkills = path.join(directory, "skills");
  if (isExistingDirectory(nestedSkills)) {
    return searchDirectoryRecursive(nestedSkills, name);
  }

  return null;
};

/** Candidate lookup follows the same global root / nested `skills` precedence,
 * but deliberately does not require a valid manifest. */
export const searchConfiguredSkillCandidate = (directory: string, name: string): string | null => {
  let configuredRoot: string;
  try {
    if (!fs.statSync(directory).isDirectory()) throw new Error("AGY_SKILL_SOURCE_ROOT_INVALID");
    configuredRoot = fs.realpathSync(directory);
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const seen = new Set<string>();
  const search = (root: string): string | null => {
    const canonical = fs.realpathSync(root);
    const relative = path.relative(configuredRoot, canonical);
    if (seen.has(canonical) || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
      throw new Error("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
    seen.add(canonical);
    if (!fs.statSync(root).isDirectory()) throw new Error("AGY_SKILL_SOURCE_ROOT_INVALID");
    const candidate = path.join(root, name);
    try { fs.lstatSync(candidate); return candidate; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const nested = path.join(root, "skills");
    try { fs.lstatSync(nested); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    return search(nested);
  };
  return search(directory);
};

/** Scan one global skills root (and its nested `skills` folders) into catalog records. */
export const scanSkillDirectory = (
  directory: string,
  dependencies: SkillDiscoveryDependencies,
  configuredRoot: string = directory,
): InstalledSkillRecord[] => {
  const records: InstalledSkillRecord[] = [];
  if (!fs.existsSync(directory)) {
    return records;
  }

  const entries = readSortedDirectoryEntries(directory);
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const itemPath = path.join(directory, entry.name);
    if (!isSkillDirectory(itemPath)) {
      continue;
    }
    try {
      const skill = dependencies.loader.loadSkill(
        itemPath,
        dependencies.isReadonlyPath(itemPath),
      );
      records.push({
        skill,
        origin: "global",
        trustedRoot: skill.rootPath,
        configuredRoot: path.resolve(configuredRoot),
      });
    } catch (error) {
      dependencies.logger.warn(`Error loading skill ${entry.name}: ${String(error)}`);
    }
  }

  const nestedSkillsDir = path.join(directory, "skills");
  if (isExistingDirectory(nestedSkillsDir)) {
    records.push(...scanSkillDirectory(nestedSkillsDir, dependencies, configuredRoot));
  }

  return records;
};
