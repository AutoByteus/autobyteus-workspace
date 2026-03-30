import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { Skill } from "../../../skills/domain/models.js";

const WORKSPACE_SKILLS_ROOT_SEGMENTS = [".codex", "skills"] as const;
const MATERIALIZED_SKILL_PREFIX = "autobyteus-";
const OWNERSHIP_MARKER_FILE = ".autobyteus-runtime-skill.json";
const MAX_CODEX_SKILL_DIRECTORY_NAME_LENGTH = 64;

type WorkspaceSkillOwnershipMarker = {
  version: 1;
  skillName: string;
  sourceRootPath: string;
};

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

const toCodexDisplayName = (skillName: string): string => {
  const normalized = collapseWhitespace(skillName.replace(/[-_]+/g, " "));
  if (!normalized) {
    return "Configured Skill";
  }
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const renderCodexWorkspaceSkillOpenAiYaml = (
  skill: Skill,
): string => {
  const shortDescription =
    collapseWhitespace(skill.description) || "Agent-configured skill for this run.";
  const defaultPrompt = `Use $${skill.name} when the request matches this skill. Follow the instructions in SKILL.md.`;

  return [
    "interface:",
    `  display_name: ${JSON.stringify(toCodexDisplayName(skill.name))}`,
    `  short_description: ${JSON.stringify(shortDescription)}`,
    `  default_prompt: ${JSON.stringify(defaultPrompt)}`,
  ].join("\n");
};

const sanitizeDirectorySegment = (value: string): string => {
  const normalized = collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "skill";
};

const buildDirectoryHash = (skill: Skill): string =>
  createHash("sha1").update(path.resolve(skill.rootPath)).digest("hex").slice(0, 12);

const buildMaterializedDirectoryName = (skill: Skill): string =>
  (() => {
    const hash = buildDirectoryHash(skill);
    const maxSkillSegmentLength = Math.max(
      1,
      MAX_CODEX_SKILL_DIRECTORY_NAME_LENGTH -
        MATERIALIZED_SKILL_PREFIX.length -
        1 -
        hash.length,
    );
    const skillSegment = sanitizeDirectorySegment(skill.name).slice(0, maxSkillSegmentLength);
    return `${MATERIALIZED_SKILL_PREFIX}${skillSegment}-${hash}`;
  })();

const buildRegistryKey = (workingDirectory: string, skill: Skill): string =>
  `${path.resolve(workingDirectory)}::${path.resolve(skill.rootPath)}`;

const buildWorkspaceSkillsRoot = (workingDirectory: string): string =>
  path.join(workingDirectory, ...WORKSPACE_SKILLS_ROOT_SEGMENTS);

const buildOwnershipMarker = (
  skill: Skill,
): WorkspaceSkillOwnershipMarker => ({
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
    const workspaceSkillsRoot = buildWorkspaceSkillsRoot(workingDirectory);
    await fs.mkdir(workspaceSkillsRoot, { recursive: true });

    const directoryName = buildMaterializedDirectoryName(skill);
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
          `Materialized Codex workspace skill path '${materializedRootPath}' already exists but is not owned by AutoByteus for skill '${skill.name}'.`,
        );
      }
      await fs.rm(materializedRootPath, {
        recursive: true,
        force: true,
      });
      await fs.cp(skill.rootPath, materializedRootPath, {
        recursive: true,
        force: false,
        errorOnExist: true,
        filter: (sourcePath) => isSourceSkillPath(sourcePath),
      });
    } else {
      await fs.cp(skill.rootPath, materializedRootPath, {
        recursive: true,
        force: false,
        errorOnExist: true,
        filter: (sourcePath) => isSourceSkillPath(sourcePath),
      });
    }

    await fs.writeFile(
      markerPath,
      JSON.stringify(expectedMarker, null, 2),
      "utf-8",
    );
    await this.ensureOpenAiAgentConfig(materializedRootPath, skill);

    return {
      name: skill.name,
      sourceRootPath: path.resolve(skill.rootPath),
      materializedRootPath,
      registryKey: buildRegistryKey(workingDirectory, skill),
    };
  }

  private async ensureOpenAiAgentConfig(
    materializedRootPath: string,
    skill: Skill,
  ): Promise<void> {
    const agentsDirectory = path.join(materializedRootPath, "agents");
    const openAiAgentConfigPath = path.join(agentsDirectory, "openai.yaml");
    const openAiConfigExists = await fs
      .stat(openAiAgentConfigPath)
      .then(() => true)
      .catch(() => false);
    if (openAiConfigExists) {
      return;
    }

    await fs.mkdir(agentsDirectory, { recursive: true });
    await fs.writeFile(
      openAiAgentConfigPath,
      renderCodexWorkspaceSkillOpenAiYaml(skill),
      "utf-8",
    );
  }

  private async removeOwnedMaterializedSkillBundle(
    materializedSkill: MaterializedCodexWorkspaceSkill,
  ): Promise<void> {
    const markerPath = path.join(
      materializedSkill.materializedRootPath,
      OWNERSHIP_MARKER_FILE,
    );
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

let cachedCodexWorkspaceSkillMaterializer: CodexWorkspaceSkillMaterializer | null = null;

export const getCodexWorkspaceSkillMaterializer = (): CodexWorkspaceSkillMaterializer => {
  if (!cachedCodexWorkspaceSkillMaterializer) {
    cachedCodexWorkspaceSkillMaterializer = new CodexWorkspaceSkillMaterializer();
  }
  return cachedCodexWorkspaceSkillMaterializer;
};
