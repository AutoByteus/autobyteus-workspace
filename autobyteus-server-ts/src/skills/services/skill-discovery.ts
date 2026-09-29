import fs from "node:fs";
import path from "node:path";
import type { DiscoveredSkillRecord } from "../domain/installed-skill-record.js";
import { SkillLoader } from "../loader.js";

/**
 * Layout scanners for the skill catalog (D-19). They only enumerate skill folders in one
 * source; precedence, duplicates and name lookup belong to the catalog in `SkillService`.
 */
export type SkillDiscoveryDependencies = {
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

/** `agents/*` by name, then `agent-teams/*` by name (each team's shared skills, then its agents). */
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
      ...getSkillFolderDirectories(path.join(teamDir, "skills")).map((skillDir) => ({
        path: skillDir,
        origin: "team_shared" as const,
        root: teamDir,
      })),
      ...getAgentSkillLocations(path.join(teamDir, "agents"), () => teamDir),
    );
  }

  return locations;
};

export const scanBundledSkillsFromDefinitionRoot = (
  definitionRoot: string,
  dependencies: SkillDiscoveryDependencies,
): DiscoveredSkillRecord[] => {
  const records: DiscoveredSkillRecord[] = [];

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

const realDirectory = (directory: string): string => {
  try {
    return fs.realpathSync(directory);
  } catch {
    return path.resolve(directory);
  }
};

/**
 * Scan one skills folder (and its nested `skills` folders) into catalog records. A nested
 * `skills` folder that leads back to a folder already scanned (a link cycle) is skipped.
 */
export const scanSkillDirectory = (
  directory: string,
  dependencies: SkillDiscoveryDependencies,
  configuredRoot: string = directory,
  visited: Set<string> = new Set(),
): DiscoveredSkillRecord[] => {
  const records: DiscoveredSkillRecord[] = [];
  if (!fs.existsSync(directory)) {
    return records;
  }
  const realPath = realDirectory(directory);
  if (visited.has(realPath)) {
    dependencies.logger.warn(`Skipping skill folder '${directory}': it leads back to a folder already scanned.`);
    return records;
  }
  visited.add(realPath);

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
    records.push(...scanSkillDirectory(nestedSkillsDir, dependencies, configuredRoot, visited));
  }

  return records;
};
