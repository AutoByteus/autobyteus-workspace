import fs from "node:fs";
import path from "node:path";
import { Skill } from "../domain/models.js";
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

const getAgentSkillDirectories = (agentsDir: string): string[] => {
  const skillDirectories: string[] = [];

  for (const agentEntry of readSortedDirectoryEntries(agentsDir)) {
    if (!agentEntry.isDirectory()) {
      continue;
    }

    const agentDir = path.join(agentsDir, agentEntry.name);
    if (isSkillDirectory(agentDir)) {
      skillDirectories.push(agentDir);
    }
    skillDirectories.push(...getSkillFolderDirectories(path.join(agentDir, "skills")));
  }

  return skillDirectories;
};

export const getBundledSkillDirectoriesFromDefinitionRoot = (
  definitionRoot: string,
): string[] => {
  const skillDirectories = [
    ...getAgentSkillDirectories(path.join(definitionRoot, "agents")),
  ];

  const teamRoots = path.join(definitionRoot, "agent-teams");
  for (const teamEntry of readSortedDirectoryEntries(teamRoots)) {
    if (!teamEntry.isDirectory()) {
      continue;
    }

    const teamDir = path.join(teamRoots, teamEntry.name);
    skillDirectories.push(
      ...getAgentSkillDirectories(path.join(teamDir, "agents")),
      ...getSkillFolderDirectories(path.join(teamDir, "skills")),
    );
  }

  return skillDirectories;
};

export const scanBundledSkillsFromDefinitionRoot = (
  definitionRoot: string,
  dependencies: SkillDiscoveryDependencies,
): Skill[] => {
  const skills: Skill[] = [];

  for (const skillDir of getBundledSkillDirectoriesFromDefinitionRoot(definitionRoot)) {
    try {
      skills.push(
        dependencies.loader.loadSkill(
          skillDir,
          dependencies.isReadonlyPath(skillDir),
        ),
      );
    } catch (error) {
      dependencies.logger.warn(
        `Error loading bundled skill at ${skillDir}: ${String(error)}`,
      );
    }
  }

  return skills;
};

export const searchBundledSkillDirectory = (
  definitionRoot: string,
  name: string,
  dependencies: SkillDiscoveryDependencies,
): string | null => {
  for (const skillDir of getBundledSkillDirectoriesFromDefinitionRoot(definitionRoot)) {
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

export const scanSkillDirectory = (
  directory: string,
  dependencies: SkillDiscoveryDependencies,
): Skill[] => {
  const skills: Skill[] = [];
  if (!fs.existsSync(directory)) {
    return skills;
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
      skills.push(
        dependencies.loader.loadSkill(
          itemPath,
          dependencies.isReadonlyPath(itemPath),
        ),
      );
    } catch (error) {
      dependencies.logger.warn(`Error loading skill ${entry.name}: ${String(error)}`);
    }
  }

  const nestedSkillsDir = path.join(directory, "skills");
  if (isExistingDirectory(nestedSkillsDir)) {
    skills.push(...scanSkillDirectory(nestedSkillsDir, dependencies));
  }

  return skills;
};
