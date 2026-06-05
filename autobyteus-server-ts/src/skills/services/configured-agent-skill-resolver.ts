import fs from "node:fs";
import path from "node:path";
import type {
  AgentDefinition,
  AgentDefinitionSourceInfo,
} from "../../agent-definition/domain/models.js";
import { Skill } from "../domain/models.js";
import { SkillLoader } from "../loader.js";
import { isSkillDirectory } from "./skill-discovery.js";

type ConfiguredAgentSkillResolverOptions = {
  loader: SkillLoader;
  isReadonlyPath: (skillPath: string) => boolean;
  resolveGlobalSkill: (name: string) => Skill | null;
  isSkillDisabled: (name: string) => boolean;
  logger: {
    warn: (...args: unknown[]) => void;
  };
};

type ResolveInput = {
  skillNames: readonly string[];
  sourceInfo?: AgentDefinitionSourceInfo | null;
  agentLabel?: string | null;
};

export class ConfiguredAgentSkillResolver {
  private readonly loader: SkillLoader;
  private readonly isReadonlyPath: (skillPath: string) => boolean;
  private readonly resolveGlobalSkill: (name: string) => Skill | null;
  private readonly isSkillDisabled: (name: string) => boolean;
  private readonly logger: ConfiguredAgentSkillResolverOptions["logger"];

  constructor(options: ConfiguredAgentSkillResolverOptions) {
    this.loader = options.loader;
    this.isReadonlyPath = options.isReadonlyPath;
    this.resolveGlobalSkill = options.resolveGlobalSkill;
    this.isSkillDisabled = options.isSkillDisabled;
    this.logger = options.logger;
  }

  resolveForAgent(agentDefinition: AgentDefinition | null | undefined): Skill[] {
    if (!agentDefinition) {
      return [];
    }
    return this.resolve({
      skillNames: agentDefinition.skillNames ?? [],
      sourceInfo: agentDefinition.sourceInfo ?? null,
      agentLabel: agentDefinition.name || agentDefinition.id || null,
    });
  }

  resolve(input: ResolveInput): Skill[] {
    const skills: Skill[] = [];
    for (const rawSkillName of input.skillNames) {
      const configuredName = this.validateConfiguredSkillName(rawSkillName, input.agentLabel);
      if (!configuredName) {
        continue;
      }

      const skill =
        this.resolveContextualSkill(configuredName, input.sourceInfo ?? null)
        ?? this.resolveGlobalSkill(configuredName);

      if (!skill) {
        this.logger.warn(
          `Skill '${configuredName}' defined in agent definition '${input.agentLabel ?? "unknown"}' could not be resolved. Skipping.`,
        );
        continue;
      }

      skills.push(skill);
    }

    return skills;
  }

  private validateConfiguredSkillName(
    rawName: string,
    agentLabel: string | null | undefined,
  ): string | null {
    const configuredName = typeof rawName === "string" ? rawName.trim() : "";
    if (!configuredName) {
      this.logger.warn(
        `Skipping empty configured skill name for agent definition '${agentLabel ?? "unknown"}'.`,
      );
      return null;
    }

    if (
      configuredName === "."
      || configuredName === ".."
      || configuredName.includes("/")
      || configuredName.includes("\\")
      || configuredName.includes("\0")
      || configuredName.includes("..")
      || path.isAbsolute(configuredName)
      || path.win32.isAbsolute(configuredName)
    ) {
      this.logger.warn(
        `Skipping unsafe configured skill name '${configuredName}' for agent definition '${agentLabel ?? "unknown"}'. Skill names must be safe single path segments.`,
      );
      return null;
    }

    return configuredName;
  }

  private resolveContextualSkill(
    configuredName: string,
    sourceInfo: AgentDefinitionSourceInfo | null,
  ): Skill | null {
    const agentDirPath = this.normalizeExistingDirectory(sourceInfo?.agentDirPath);
    if (agentDirPath) {
      const privateSkill = this.loadContextualCandidate(
        configuredName,
        path.join(agentDirPath, "skills", configuredName),
        "agent-private skill folder",
      );
      if (privateSkill) {
        return privateSkill;
      }
    }

    const teamDirPath = this.normalizeExistingDirectory(sourceInfo?.teamDirPath);
    if (teamDirPath) {
      const teamSkill = this.loadContextualCandidate(
        configuredName,
        path.join(teamDirPath, "skills", configuredName),
        "team-shared skill folder",
      );
      if (teamSkill) {
        return teamSkill;
      }
    }

    return null;
  }

  private loadContextualCandidate(
    configuredName: string,
    candidateDir: string,
    candidateLabel: string,
  ): Skill | null {
    if (!isSkillDirectory(candidateDir)) {
      return null;
    }

    try {
      const skill = this.loader.loadSkill(candidateDir, this.isReadonlyPath(candidateDir));
      if (skill.name !== configuredName) {
        this.logger.warn(
          `Skipping ${candidateLabel} at '${candidateDir}' for configured skill '${configuredName}' because SKILL.md declares name '${skill.name}'.`,
        );
        return null;
      }
      skill.isDisabled = this.isSkillDisabled(skill.name);
      return skill;
    } catch (error) {
      this.logger.warn(
        `Error loading ${candidateLabel} '${configuredName}' at '${candidateDir}': ${String(error)}`,
      );
      return null;
    }
  }

  private normalizeExistingDirectory(directoryPath: string | null | undefined): string | null {
    if (!directoryPath) {
      return null;
    }
    try {
      if (!fs.statSync(directoryPath).isDirectory()) {
        return null;
      }
      return path.resolve(directoryPath);
    } catch {
      return null;
    }
  }
}
