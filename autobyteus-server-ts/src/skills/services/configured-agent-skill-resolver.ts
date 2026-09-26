import fs from "node:fs";
import path from "node:path";
import type {
  AgentDefinition,
  AgentDefinitionSourceInfo,
} from "../../agent-definition/domain/models.js";
import { Skill } from "../domain/models.js";
import type { ConfiguredAgentSkillBinding, ConfiguredSkillSource, DetailedConfiguredSkillResolution } from "../domain/configured-agent-skill-binding.js";
import { SkillLoader } from "../loader.js";
import { isSkillDirectory } from "./skill-discovery.js";
import { fingerprintConfiguredSkillSource } from "./configured-skill-source-fingerprint.js";

type ConfiguredAgentSkillResolverOptions = {
  loader: SkillLoader;
  isReadonlyPath: (skillPath: string) => boolean;
  resolveGlobalSkill: (name: string) => Skill | null;
  globalCandidatePaths?: (name: string) => string[];
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
  private readonly globalCandidatePaths: (name: string) => string[];
  private readonly isSkillDisabled: (name: string) => boolean;
  private readonly logger: ConfiguredAgentSkillResolverOptions["logger"];

  constructor(options: ConfiguredAgentSkillResolverOptions) {
    this.loader = options.loader;
    this.isReadonlyPath = options.isReadonlyPath;
    this.resolveGlobalSkill = options.resolveGlobalSkill;
    this.globalCandidatePaths = options.globalCandidatePaths ?? (() => []);
    this.isSkillDisabled = options.isSkillDisabled;
    this.logger = options.logger;
  }

  resolveForAgent(
    agentDefinition: AgentDefinition | null | undefined,
  ): ConfiguredAgentSkillBinding[] {
    if (!agentDefinition) {
      return [];
    }
    return this.resolve({
      skillNames: agentDefinition.skillNames ?? [],
      sourceInfo: agentDefinition.sourceInfo ?? null,
      agentLabel: agentDefinition.name || agentDefinition.id || null,
    });
  }

  resolve(input: ResolveInput): ConfiguredAgentSkillBinding[] {
    const bindings: ConfiguredAgentSkillBinding[] = [];
    for (const rawSkillName of input.skillNames) {
      const configuredName = this.validateConfiguredSkillName(rawSkillName, input.agentLabel);
      if (!configuredName) {
        continue;
      }

      const contextual = this.resolveContextualSkill(configuredName, input.sourceInfo ?? null);
      const skill = contextual?.skill ?? this.resolveGlobalSkill(configuredName);

      if (!skill) {
        this.logger.warn(
          `Skill '${configuredName}' defined in agent definition '${input.agentLabel ?? "unknown"}' could not be resolved. Recording an unresolved binding for workspace reconciliation.`,
        );
        bindings.push({ kind: "unresolved", name: configuredName });
        continue;
      }

      const source = contextual?.source ?? this.sourceFor("global", skill, skill.rootPath);
      bindings.push({ kind: "resolved", skill, source });
    }

    return bindings;
  }

  resolveForAgentDetailed(agentDefinition: AgentDefinition | null | undefined): DetailedConfiguredSkillResolution[] {
    if (!agentDefinition) return [];
    const outcomes: DetailedConfiguredSkillResolution[] = [];
    for (const rawName of agentDefinition.skillNames ?? []) {
      const name = typeof rawName === "string" ? rawName.trim() : "";
      if (!name || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) {
        outcomes.push({ kind: "invalid_candidate", name, reason: "unsafe_name" });
        continue;
      }
      const sourceInfo = agentDefinition.sourceInfo ?? null;
      const candidates: { path: string; origin: ConfiguredSkillSource["origin"]; trustedRoot: string }[] = [];
      const agentDir = this.normalizeExistingDirectory(sourceInfo?.agentDirPath);
      const teamDir = this.normalizeExistingDirectory(sourceInfo?.teamDirPath);
      if (agentDir) candidates.push({ path: path.join(agentDir, "skills", name), origin: "agent_private", trustedRoot: teamDir ?? agentDir });
      if (teamDir) candidates.push({ path: path.join(teamDir, "skills", name), origin: "team_shared", trustedRoot: teamDir });
      for (const candidate of this.globalCandidatePaths(name))
        candidates.push({ path: candidate, origin: "global", trustedRoot: candidate });
      let outcome: DetailedConfiguredSkillResolution | null = null;
      for (const candidate of candidates) {
        try { fs.lstatSync(candidate.path); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
          outcome = { kind: "invalid_candidate", name, reason: "present_invalid" }; break;
        }
        try {
          if (!fs.statSync(candidate.path).isDirectory()) throw new Error("not a directory");
          const skill = this.loader.loadSkill(candidate.path, this.isReadonlyPath(candidate.path));
          if (skill.name !== name) throw new Error("declared name differs");
          skill.isDisabled = this.isSkillDisabled(name);
          outcome = { kind: "resolved", skill,
            source: this.sourceFor(candidate.origin, skill, candidate.trustedRoot),
            sourceTreeSha256: fingerprintConfiguredSkillSource(candidate.path, candidate.trustedRoot) };
        } catch { outcome = { kind: "invalid_candidate", name, reason: "present_invalid" }; }
        break;
      }
      outcomes.push(outcome ?? { kind: "certified_absent", name });
    }
    return outcomes;
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
  ): { skill: Skill; source: ConfiguredSkillSource } | null {
    const agentDirPath = this.normalizeExistingDirectory(sourceInfo?.agentDirPath);
    const teamDirPath = this.normalizeExistingDirectory(sourceInfo?.teamDirPath);
    if (agentDirPath) {
      const privateSkill = this.loadContextualCandidate(
        configuredName,
        path.join(agentDirPath, "skills", configuredName),
        "agent-private skill folder",
      );
      if (privateSkill) {
        return { skill: privateSkill, source: this.sourceFor("agent_private", privateSkill, teamDirPath ?? agentDirPath) };
      }
    }

    if (teamDirPath) {
      const teamSkill = this.loadContextualCandidate(
        configuredName,
        path.join(teamDirPath, "skills", configuredName),
        "team-shared skill folder",
      );
      if (teamSkill) {
        return { skill: teamSkill, source: this.sourceFor("team_shared", teamSkill, teamDirPath) };
      }
    }

    return null;
  }

  private sourceFor(
    origin: ConfiguredSkillSource["origin"], skill: Skill, trustedRoot: string,
  ): ConfiguredSkillSource {
    return { origin, sourceRoot: fs.realpathSync(skill.rootPath), trustedRoot: fs.realpathSync(trustedRoot) };
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
