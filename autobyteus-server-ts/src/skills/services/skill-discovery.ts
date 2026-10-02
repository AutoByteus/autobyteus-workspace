import fs from "node:fs";
import path from "node:path";
import type { DiscoveredSkillRecord } from "../domain/installed-skill-record.js";
import { SkillLoader } from "../loader.js";
import { listAgentOrgOwnedDefinitionSourcesSync } from "../../agent-org-definition/providers/agent-org-owned-definition-source-index.js";

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

const getAgentSkillLocations = (agentsDir: string): string[] => {
  const locations: string[] = [];

  for (const agentEntry of readSortedDirectoryEntries(agentsDir)) {
    if (!agentEntry.isDirectory()) {
      continue;
    }

    const agentDir = path.join(agentsDir, agentEntry.name);
    locations.push(...getSkillFolderDirectories(path.join(agentDir, "skills")));
  }

  return locations;
};

/** A team folder's shared skills, then its local agents' skills. */
const getTeamSkillLocations = (teamDir: string): string[] => [
  ...getSkillFolderDirectories(path.join(teamDir, "skills")),
  ...getAgentSkillLocations(path.join(teamDir, "agents")),
];

/**
 * Agent Org layouts (D-19, SR-018): for each Org by name, its org-owned agents by name
 * (`<agentDir>/skills/*`), then its org-owned teams by name (see
 * `getTeamSkillLocations`). Org-owned folders come from the exact owned-source correlation; an
 * Org has no org-level `skills/` folder.
 */
const getAgentOrgSkillLocations = (orgRoot: string): string[] => {
  const sources = [
    ...listAgentOrgOwnedDefinitionSourcesSync({ subject: "agent", orgRoots: [orgRoot] }),
    ...listAgentOrgOwnedDefinitionSourcesSync({ subject: "agent_team", orgRoots: [orgRoot] }),
  ].sort((left, right) => left.orgDefinitionId.localeCompare(right.orgDefinitionId)
    || (left.subject === right.subject ? 0 : left.subject === "agent" ? -1 : 1)
    || left.localDefinitionId.localeCompare(right.localDefinitionId));
  return sources.flatMap((source) => source.subject === "agent"
    ? getSkillFolderDirectories(path.join(source.definitionDir, "skills"))
    : getTeamSkillLocations(source.definitionDir));
};

/**
 * `agents/*` by name, then `agent-teams/*` by name (each team's shared skills, then its agents),
 * then the Agent Orgs under `orgRoot` (`<definitionRoot>/agent-orgs` unless the caller's config
 * places them elsewhere, as for the app data dir).
 */
const getBundledSkillLocationsFromDefinitionRoot = (
  definitionRoot: string,
  orgRoot: string,
): string[] => {
  const locations = getAgentSkillLocations(path.join(definitionRoot, "agents"));

  const teamRoots = path.join(definitionRoot, "agent-teams");
  for (const teamEntry of readSortedDirectoryEntries(teamRoots)) {
    if (!teamEntry.isDirectory()) {
      continue;
    }

    locations.push(...getTeamSkillLocations(path.join(teamRoots, teamEntry.name)));
  }

  return [...locations, ...getAgentOrgSkillLocations(orgRoot)];
};

export const scanBundledSkillsFromDefinitionRoot = (
  definitionRoot: string,
  dependencies: SkillDiscoveryDependencies,
  orgRoot: string = path.join(definitionRoot, "agent-orgs"),
): DiscoveredSkillRecord[] => {
  const records: DiscoveredSkillRecord[] = [];

  for (const location of getBundledSkillLocationsFromDefinitionRoot(definitionRoot, orgRoot)) {
    try {
      const skill = dependencies.loader.loadSkill(
        location,
        dependencies.isReadonlyPath(location),
      );
      records.push({ skill });
    } catch (error) {
      dependencies.logger.warn(
        `Error loading bundled skill at ${location}: ${String(error)}`,
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
      records.push({ skill });
    } catch (error) {
      dependencies.logger.warn(`Error loading skill ${entry.name}: ${String(error)}`);
    }
  }

  const nestedSkillsDir = path.join(directory, "skills");
  if (isExistingDirectory(nestedSkillsDir)) {
    records.push(...scanSkillDirectory(nestedSkillsDir, dependencies, visited));
  }

  return records;
};
