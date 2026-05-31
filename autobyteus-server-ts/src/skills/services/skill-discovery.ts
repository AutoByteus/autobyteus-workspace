import fs from "node:fs";
import path from "node:path";
import { Skill } from "../domain/models.js";
import { SkillLoader } from "../loader.js";

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

export const getAllSkillDirectories = (config: SkillDirectoryConfig): string[] => [
  config.getSkillsDir(),
  ...config.getAdditionalSkillsDirs(),
];

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
  if (fs.existsSync(nestedSkills) && fs.statSync(nestedSkills).isDirectory()) {
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

  return skills;
};
