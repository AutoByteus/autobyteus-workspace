import fs from "node:fs";
import path from "node:path";
import { Skill } from "../domain/models.js";
import { SkillLoader } from "../loader.js";

type AgentPackageRootConfig = {
  getAppDataDir(): string;
  getAdditionalAgentPackageRoots(): string[];
};

type SkillDirectoryConfig = {
  getSkillsDir(): string;
  getAdditionalSkillsDirs(): string[];
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

export const getAllDefinitionRoots = (config: AgentPackageRootConfig): string[] => {
  const roots = [config.getAppDataDir(), ...config.getAdditionalAgentPackageRoots()];
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

export const searchBundledSkillDirectory = (
  definitionRoot: string,
  name: string,
): string | null => {
  const candidate = path.join(definitionRoot, "agents", name);
  if (fs.existsSync(candidate) && isSkillDirectory(candidate)) {
    return candidate;
  }

  const teamRoots = path.join(definitionRoot, "agent-teams");
  if (!fs.existsSync(teamRoots) || !fs.statSync(teamRoots).isDirectory()) {
    return null;
  }

  const teamEntries = fs.readdirSync(teamRoots, { withFileTypes: true });
  for (const teamEntry of teamEntries) {
    if (!teamEntry.isDirectory()) {
      continue;
    }
    const localCandidate = path.join(teamRoots, teamEntry.name, "agents", name);
    if (fs.existsSync(localCandidate) && isSkillDirectory(localCandidate)) {
      return localCandidate;
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

  const bundledCandidate = searchBundledSkillDirectory(directory, name);
  if (bundledCandidate) {
    return bundledCandidate;
  }

  const nestedSkills = path.join(directory, "skills");
  if (fs.existsSync(nestedSkills) && fs.statSync(nestedSkills).isDirectory()) {
    return searchDirectoryRecursive(nestedSkills, name);
  }

  return null;
};

export const scanBundledSkillsFromDefinitionRoot = (
  definitionRoot: string,
  dependencies: SkillDiscoveryDependencies,
): Skill[] => {
  const skills: Skill[] = [];
  const agentsDir = path.join(definitionRoot, "agents");
  if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const skillDir = path.join(agentsDir, entry.name);
      if (!isSkillDirectory(skillDir)) {
        continue;
      }
      try {
        skills.push(
          dependencies.loader.loadSkill(
            skillDir,
            dependencies.isReadonlyPath(skillDir),
          ),
        );
      } catch (error) {
        dependencies.logger.warn(
          `Error loading bundled skill ${entry.name}: ${String(error)}`,
        );
      }
    }
  }

  const teamRoots = path.join(definitionRoot, "agent-teams");
  if (!fs.existsSync(teamRoots) || !fs.statSync(teamRoots).isDirectory()) {
    return skills;
  }

  const teamEntries = fs.readdirSync(teamRoots, { withFileTypes: true });
  for (const teamEntry of teamEntries) {
    if (!teamEntry.isDirectory()) {
      continue;
    }
    const localAgentsDir = path.join(teamRoots, teamEntry.name, "agents");
    if (!fs.existsSync(localAgentsDir) || !fs.statSync(localAgentsDir).isDirectory()) {
      continue;
    }
    const localAgentEntries = fs.readdirSync(localAgentsDir, { withFileTypes: true });
    for (const localAgentEntry of localAgentEntries) {
      if (!localAgentEntry.isDirectory()) {
        continue;
      }
      const skillDir = path.join(localAgentsDir, localAgentEntry.name);
      if (!isSkillDirectory(skillDir)) {
        continue;
      }
      try {
        skills.push(
          dependencies.loader.loadSkill(
            skillDir,
            dependencies.isReadonlyPath(skillDir),
          ),
        );
      } catch (error) {
        dependencies.logger.warn(
          `Error loading bundled local skill ${teamEntry.name}/${localAgentEntry.name}: ${String(error)}`,
        );
      }
    }
  }

  return skills;
};

export const scanSkillDirectory = (
  directory: string,
  dependencies: SkillDiscoveryDependencies,
): Skill[] => {
  const skills: Skill[] = [];
  if (!fs.existsSync(directory)) {
    return skills;
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
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
  if (fs.existsSync(nestedSkillsDir) && fs.statSync(nestedSkillsDir).isDirectory()) {
    skills.push(...scanSkillDirectory(nestedSkillsDir, dependencies));
  }

  skills.push(...scanBundledSkillsFromDefinitionRoot(directory, dependencies));

  return skills;
};
