import fs from "node:fs";
import path from "node:path";
import type {
  AgentDefinition,
  AgentDefinitionSourceInfo,
} from "../../agent-definition/domain/models.js";
import { Skill } from "../domain/models.js";
import type { ConfiguredAgentSkillBinding } from "../domain/configured-agent-skill-binding.js";
import type { InstalledSkillRecord } from "../domain/installed-skill-record.js";
import { SkillLoader } from "../loader.js";
import { isSkillDirectory } from "./skill-discovery.js";

type ConfiguredAgentSkillResolverOptions = {
  loader: SkillLoader;
  isReadonlyPath: (skillPath: string) => boolean;
  isSkillDisabled: (name: string) => boolean;
  logger: {
    warn: (...args: unknown[]) => void;
  };
};

/** The catalog's used copy of a name, or null (D-19: one resolution for every scope). */
export type SkillCatalogLookup = (name: string) => InstalledSkillRecord | null;

/**
 * Application-owned agents are sandboxed bundles, not installed skills: they resolve their
 * app-bundled skills from their bundle first, then the catalog (D-19 boundary).
 */
const resolvesFromOwnBundle = (agentDefinition: AgentDefinition): boolean =>
  agentDefinition.ownershipScope === "application_owned";

export class ConfiguredAgentSkillResolver {
  private readonly loader: SkillLoader;
  private readonly isReadonlyPath: (skillPath: string) => boolean;
  private readonly isSkillDisabled: (name: string) => boolean;
  private readonly logger: ConfiguredAgentSkillResolverOptions["logger"];

  constructor(options: ConfiguredAgentSkillResolverOptions) {
    this.loader = options.loader;
    this.isReadonlyPath = options.isReadonlyPath;
    this.isSkillDisabled = options.isSkillDisabled;
    this.logger = options.logger;
  }

  /**
   * Configured names resolve by name against the catalog, the same copy ALL_INSTALLED and the
   * Skills page use. Only application-owned agents look in their own bundle first.
   */
  resolveForAgent(
    agentDefinition: AgentDefinition | null | undefined,
    catalog: SkillCatalogLookup,
  ): ConfiguredAgentSkillBinding[] {
    if (!agentDefinition) {
      return [];
    }
    const agentLabel = agentDefinition.name || agentDefinition.id || null;
    const ownBundle = resolvesFromOwnBundle(agentDefinition);
    const bindings: ConfiguredAgentSkillBinding[] = [];
    for (const rawSkillName of agentDefinition.skillNames ?? []) {
      const configuredName = this.validateConfiguredSkillName(rawSkillName, agentLabel);
      if (!configuredName) {
        continue;
      }

      const contextual = ownBundle
        ? this.resolveContextualSkill(configuredName, agentDefinition.sourceInfo ?? null)
        : null;
      if (contextual) {
        bindings.push({ kind: "resolved", skill: contextual });
        continue;
      }
      const record = catalog(configuredName);
      if (!record) {
        this.logger.warn(
          `Skill '${configuredName}' defined in agent definition '${agentLabel ?? "unknown"}' could not be resolved. Recording an unresolved binding for workspace reconciliation.`,
        );
        bindings.push({ kind: "unresolved", name: configuredName });
        continue;
      }
      bindings.push(this.bindInstalledRecord(record));
    }

    return bindings;
  }

  /** Regular binding for one catalog record, no name lookup. */
  bindInstalledRecord(record: InstalledSkillRecord): ConfiguredAgentSkillBinding {
    return { kind: "resolved", skill: record.skill };
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
    const teamDirPath = this.normalizeExistingDirectory(sourceInfo?.teamDirPath);
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
