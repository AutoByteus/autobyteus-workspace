import fs from "node:fs/promises";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { Skill } from "../../../skills/domain/models.js";

const WORKSPACE_SKILLS_ROOT_SEGMENTS = [".codex", "skills"] as const;

export type MaterializedCodexWorkspaceSkill = {
  name: string;
  sourceRootPath: string;
  materializedRootPath: string;
  registryKey: string;
};

type MaterializedSkillRegistryEntry = {
  descriptor: MaterializedCodexWorkspaceSkill;
  holderCount: number;
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const sanitizeDirectorySegment = (value: string): string => {
  const normalized = collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "skill";
};

const buildMaterializedDirectoryName = (skill: Skill): string =>
  sanitizeDirectorySegment(skill.name);

const buildRegistryKey = (workingDirectory: string, skill: Skill): string =>
  `${path.resolve(workingDirectory)}::${path.resolve(skill.rootPath)}`;

const buildWorkspaceSkillsRoot = (workingDirectory: string): string =>
  path.join(workingDirectory, ...WORKSPACE_SKILLS_ROOT_SEGMENTS);

type ExistingWorkspaceSkillPathState =
  | { kind: "missing" }
  | { kind: "same-source-symlink" }
  | { kind: "collision"; message: string };

const resolveSymlinkTargetPath = (linkPath: string, targetPath: string): string =>
  path.resolve(path.dirname(linkPath), targetPath);

const comparePaths = async (leftPath: string, rightPath: string): Promise<boolean> => {
  const [leftRealPath, rightRealPath] = await Promise.all([
    fs.realpath(leftPath).catch(() => null),
    fs.realpath(rightPath).catch(() => null),
  ]);
  if (leftRealPath && rightRealPath) {
    return leftRealPath === rightRealPath;
  }
  return path.resolve(leftPath) === path.resolve(rightPath);
};

const isExpectedWorkspaceSkillSymlink = async (
  workspaceSkillPath: string,
  sourceRootPath: string,
): Promise<boolean> => {
  try {
    const stats = await fs.lstat(workspaceSkillPath);
    if (!stats.isSymbolicLink()) {
      return false;
    }
    const targetPath = await fs.readlink(workspaceSkillPath);
    return comparePaths(
      resolveSymlinkTargetPath(workspaceSkillPath, targetPath),
      sourceRootPath,
    );
  } catch {
    return false;
  }
};

const inspectExistingWorkspaceSkillPath = async (
  workspaceSkillPath: string,
  sourceRootPath: string,
): Promise<ExistingWorkspaceSkillPathState> => {
  try {
    const stats = await fs.lstat(workspaceSkillPath);
    if (!stats.isSymbolicLink()) {
      return {
        kind: "collision",
        message: `workspace skill path '${workspaceSkillPath}' already exists and is not a symlink`,
      };
    }

    const targetPath = await fs.readlink(workspaceSkillPath);
    const resolvedTargetPath = resolveSymlinkTargetPath(workspaceSkillPath, targetPath);
    if (await comparePaths(resolvedTargetPath, sourceRootPath)) {
      return { kind: "same-source-symlink" };
    }

    return {
      kind: "collision",
      message: `workspace skill path '${workspaceSkillPath}' already points to '${resolvedTargetPath}' instead of '${sourceRootPath}'`,
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { kind: "missing" };
    }
    throw error;
  }
};

const assertSourceSkillManifestExists = async (
  skillName: string,
  sourceRootPath: string,
): Promise<void> => {
  const skillManifestPath = path.join(sourceRootPath, "SKILL.md");
  await fs.stat(skillManifestPath).catch(() => {
    throw new Error(
      `Configured Codex workspace skill '${skillName}' is missing SKILL.md at '${skillManifestPath}'.`,
    );
  });
};

export class CodexWorkspaceSkillMaterializer {
  private readonly registry = new Map<string, MaterializedSkillRegistryEntry>();

  async materializeConfiguredCodexWorkspaceSkills(options: {
    workingDirectory: string;
    configuredSkills?: Skill[] | null;
    skillAccessMode?: SkillAccessMode | null;
  }): Promise<MaterializedCodexWorkspaceSkill[]> {
    const configuredSkills =
      options.skillAccessMode === SkillAccessMode.NONE ? [] : options.configuredSkills ?? [];
    if (configuredSkills.length === 0) {
      return [];
    }

    const materializedSkills: MaterializedCodexWorkspaceSkill[] = [];
    for (const skill of configuredSkills) {
      materializedSkills.push(
        await this.acquireMaterializedSkill(options.workingDirectory, skill),
      );
    }
    return materializedSkills;
  }

  async cleanupMaterializedCodexWorkspaceSkills(
    materializedSkills: MaterializedCodexWorkspaceSkill[] | null | undefined,
  ): Promise<void> {
    for (const materializedSkill of materializedSkills ?? []) {
      await this.releaseMaterializedSkill(materializedSkill);
    }
  }

  private async acquireMaterializedSkill(
    workingDirectory: string,
    skill: Skill,
  ): Promise<MaterializedCodexWorkspaceSkill> {
    const registryKey = buildRegistryKey(workingDirectory, skill);
    const existing = this.registry.get(registryKey);
    if (existing) {
      existing.holderCount += 1;
      return existing.descriptor;
    }

    const descriptor = await this.ensureMaterializedSkillBundle(workingDirectory, skill);
    this.registry.set(registryKey, {
      descriptor,
      holderCount: 1,
    });
    return descriptor;
  }

  private async releaseMaterializedSkill(
    materializedSkill: MaterializedCodexWorkspaceSkill,
  ): Promise<void> {
    const registryEntry = this.registry.get(materializedSkill.registryKey);
    if (!registryEntry) {
      return;
    }

    registryEntry.holderCount -= 1;
    if (registryEntry.holderCount > 0) {
      return;
    }

    this.registry.delete(materializedSkill.registryKey);
    try {
      await this.removeOwnedMaterializedSkillBundle(registryEntry.descriptor);
    } catch (error) {
      logger.warn(
        `Failed to clean up materialized Codex workspace skill '${registryEntry.descriptor.name}': ${String(error)}`,
      );
    }
  }

  private async ensureMaterializedSkillBundle(
    workingDirectory: string,
    skill: Skill,
  ): Promise<MaterializedCodexWorkspaceSkill> {
    const sourceRootPath = path.resolve(skill.rootPath);
    await assertSourceSkillManifestExists(skill.name, sourceRootPath);

    const workspaceSkillsRoot = buildWorkspaceSkillsRoot(workingDirectory);
    await fs.mkdir(workspaceSkillsRoot, { recursive: true });

    const directoryName = buildMaterializedDirectoryName(skill);
    const materializedRootPath = path.join(workspaceSkillsRoot, directoryName);
    const existingPathState = await inspectExistingWorkspaceSkillPath(
      materializedRootPath,
      sourceRootPath,
    );
    if (existingPathState.kind === "collision") {
      throw new Error(
        `Workspace skill path collision for Codex skill '${skill.name}': ${existingPathState.message}.`,
      );
    }
    if (existingPathState.kind === "missing") {
      await fs.symlink(sourceRootPath, materializedRootPath, "dir");
    }

    return {
      name: skill.name,
      sourceRootPath,
      materializedRootPath,
      registryKey: buildRegistryKey(workingDirectory, skill),
    };
  }

  private async removeOwnedMaterializedSkillBundle(
    materializedSkill: MaterializedCodexWorkspaceSkill,
  ): Promise<void> {
    if (
      !(await isExpectedWorkspaceSkillSymlink(
        materializedSkill.materializedRootPath,
        materializedSkill.sourceRootPath,
      ))
    ) {
      return;
    }
    await fs.unlink(materializedSkill.materializedRootPath);
  }
}

let cachedCodexWorkspaceSkillMaterializer: CodexWorkspaceSkillMaterializer | null = null;

export const getCodexWorkspaceSkillMaterializer = (): CodexWorkspaceSkillMaterializer => {
  if (!cachedCodexWorkspaceSkillMaterializer) {
    cachedCodexWorkspaceSkillMaterializer = new CodexWorkspaceSkillMaterializer();
  }
  return cachedCodexWorkspaceSkillMaterializer;
};
