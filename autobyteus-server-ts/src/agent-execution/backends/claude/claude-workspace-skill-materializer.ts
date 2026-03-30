import fs from "node:fs/promises";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { Skill } from "../../../skills/domain/models.js";

const WORKSPACE_SKILLS_ROOT_SEGMENTS = [".claude", "skills"] as const;
const OWNERSHIP_MARKER_FILE = ".autobyteus-runtime-skill.json";

type WorkspaceSkillOwnershipMarker = {
  version: 1;
  skillName: string;
  sourceRootPath: string;
};

export type MaterializedClaudeWorkspaceSkill = {
  name: string;
  sourceRootPath: string;
  materializedRootPath: string;
  registryKey: string;
};

type MaterializedSkillRegistryEntry = {
  descriptor: MaterializedClaudeWorkspaceSkill;
  holderCount: number;
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const sanitizeDirectorySegment = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "skill";
};

const buildRegistryKey = (workingDirectory: string, skill: Skill): string =>
  `${path.resolve(workingDirectory)}::${path.resolve(skill.rootPath)}`;

const buildWorkspaceSkillsRoot = (workingDirectory: string): string =>
  path.join(workingDirectory, ...WORKSPACE_SKILLS_ROOT_SEGMENTS);

const buildOwnershipMarker = (skill: Skill): WorkspaceSkillOwnershipMarker => ({
  version: 1,
  skillName: skill.name,
  sourceRootPath: path.resolve(skill.rootPath),
});

const isSourceSkillPath = (sourcePath: string): boolean => {
  const segments = sourcePath.split(path.sep);
  return !segments.includes(".git");
};

const readOwnershipMarker = async (
  markerPath: string,
): Promise<WorkspaceSkillOwnershipMarker | null> => {
  try {
    const raw = await fs.readFile(markerPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.version === 1 &&
      typeof parsed.skillName === "string" &&
      typeof parsed.sourceRootPath === "string"
    ) {
      return {
        version: 1,
        skillName: parsed.skillName,
        sourceRootPath: parsed.sourceRootPath,
      };
    }
  } catch {
    return null;
  }
  return null;
};

const markersMatch = (
  marker: WorkspaceSkillOwnershipMarker | null,
  expected: WorkspaceSkillOwnershipMarker,
): boolean =>
  marker?.version === expected.version &&
  marker.skillName === expected.skillName &&
  path.resolve(marker.sourceRootPath) === path.resolve(expected.sourceRootPath);

export class ClaudeWorkspaceSkillMaterializer {
  private readonly registry = new Map<string, MaterializedSkillRegistryEntry>();

  async materializeConfiguredClaudeWorkspaceSkills(options: {
    workingDirectory: string;
    configuredSkills?: Skill[] | null;
    skillAccessMode?: SkillAccessMode | null;
  }): Promise<MaterializedClaudeWorkspaceSkill[]> {
    const configuredSkills =
      options.skillAccessMode === SkillAccessMode.NONE ? [] : options.configuredSkills ?? [];
    if (configuredSkills.length === 0) {
      return [];
    }

    const materializedSkills: MaterializedClaudeWorkspaceSkill[] = [];
    for (const skill of configuredSkills) {
      materializedSkills.push(
        await this.acquireMaterializedSkill(options.workingDirectory, skill),
      );
    }
    return materializedSkills;
  }

  async cleanupMaterializedClaudeWorkspaceSkills(
    materializedSkills: MaterializedClaudeWorkspaceSkill[] | null | undefined,
  ): Promise<void> {
    for (const materializedSkill of materializedSkills ?? []) {
      await this.releaseMaterializedSkill(materializedSkill);
    }
  }

  private async acquireMaterializedSkill(
    workingDirectory: string,
    skill: Skill,
  ): Promise<MaterializedClaudeWorkspaceSkill> {
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
    materializedSkill: MaterializedClaudeWorkspaceSkill,
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
        `Failed to clean up materialized Claude workspace skill '${registryEntry.descriptor.name}': ${String(error)}`,
      );
    }
  }

  private async ensureMaterializedSkillBundle(
    workingDirectory: string,
    skill: Skill,
  ): Promise<MaterializedClaudeWorkspaceSkill> {
    const workspaceSkillsRoot = buildWorkspaceSkillsRoot(workingDirectory);
    await fs.mkdir(workspaceSkillsRoot, { recursive: true });

    const directoryName = sanitizeDirectorySegment(skill.name);
    const materializedRootPath = path.join(workspaceSkillsRoot, directoryName);
    const markerPath = path.join(materializedRootPath, OWNERSHIP_MARKER_FILE);
    const expectedMarker = buildOwnershipMarker(skill);

    const targetExists = await fs
      .stat(materializedRootPath)
      .then(() => true)
      .catch(() => false);
    if (targetExists) {
      const marker = await readOwnershipMarker(markerPath);
      if (!markersMatch(marker, expectedMarker)) {
        throw new Error(
          `Materialized Claude workspace skill path '${materializedRootPath}' already exists but is not owned by AutoByteus for skill '${skill.name}'.`,
        );
      }
      await fs.rm(materializedRootPath, {
        recursive: true,
        force: true,
      });
    }

    await fs.cp(skill.rootPath, materializedRootPath, {
      recursive: true,
      force: false,
      errorOnExist: true,
      filter: (sourcePath) => isSourceSkillPath(sourcePath),
    });

    const skillManifestPath = path.join(materializedRootPath, "SKILL.md");
    await fs.stat(skillManifestPath).catch(() => {
      throw new Error(
        `Materialized Claude workspace skill '${skill.name}' is missing SKILL.md at '${skillManifestPath}'.`,
      );
    });

    await fs.writeFile(
      markerPath,
      JSON.stringify(expectedMarker, null, 2),
      "utf-8",
    );

    return {
      name: skill.name,
      sourceRootPath: path.resolve(skill.rootPath),
      materializedRootPath,
      registryKey: buildRegistryKey(workingDirectory, skill),
    };
  }

  private async removeOwnedMaterializedSkillBundle(
    materializedSkill: MaterializedClaudeWorkspaceSkill,
  ): Promise<void> {
    const markerPath = path.join(materializedSkill.materializedRootPath, OWNERSHIP_MARKER_FILE);
    const marker = await readOwnershipMarker(markerPath);
    if (
      !markersMatch(marker, {
        version: 1,
        skillName: materializedSkill.name,
        sourceRootPath: materializedSkill.sourceRootPath,
      })
    ) {
      return;
    }
    await fs.rm(materializedSkill.materializedRootPath, {
      recursive: true,
      force: true,
    });
  }
}

let cachedClaudeWorkspaceSkillMaterializer: ClaudeWorkspaceSkillMaterializer | null = null;

export const getClaudeWorkspaceSkillMaterializer = (): ClaudeWorkspaceSkillMaterializer => {
  if (!cachedClaudeWorkspaceSkillMaterializer) {
    cachedClaudeWorkspaceSkillMaterializer = new ClaudeWorkspaceSkillMaterializer();
  }
  return cachedClaudeWorkspaceSkillMaterializer;
};
