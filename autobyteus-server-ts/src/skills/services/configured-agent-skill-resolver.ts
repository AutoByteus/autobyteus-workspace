import fs from "node:fs";
import path from "node:path";
import type {
  AgentDefinition,
  AgentDefinitionSourceInfo,
} from "../../agent-definition/domain/models.js";
import { Skill } from "../domain/models.js";
import type { ConfiguredAgentSkillBinding, ConfiguredSkillSource, DetailedConfiguredSkillResolution } from "../domain/configured-agent-skill-binding.js";
import type { InstalledSkillRecord } from "../domain/installed-skill-record.js";
import { SkillLoader } from "../loader.js";
import { isSkillDirectory } from "./skill-discovery.js";
import { assertConfiguredSkillSourceSafety, fingerprintConfiguredSkillSource } from "./configured-skill-source-fingerprint.js";

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

type DetailedCandidate = {
  path: string;
  origin: ConfiguredSkillSource["origin"];
  trustedRoot: string;
  configuredRoot: string;
};

const safetyFailure = (code: string): Error => new Error(code);
const contains = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

const assertDetailedCandidateProvenance = (candidate: DetailedCandidate, name: string): void => {
  try {
    const stat = fs.lstatSync(candidate.path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
    const sourceRoot = fs.realpathSync(candidate.path);
    const trustedRoot = fs.realpathSync(candidate.trustedRoot);
    const configuredRoot = fs.realpathSync(candidate.configuredRoot);
    if (!contains(trustedRoot, sourceRoot) || !contains(configuredRoot, sourceRoot))
      throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
    const parts = path.relative(trustedRoot, sourceRoot).split(path.sep);
    const layout = candidate.origin === "global" ? trustedRoot === sourceRoot
      : candidate.origin === "team_shared" ? parts.length === 2 && parts[0] === "skills" && parts[1] === name
        : (parts.length === 2 && parts[0] === "skills" && parts[1] === name)
          || (parts.length === 4 && parts[0] === "agents" && !!parts[1] && parts[2] === "skills" && parts[3] === name);
    if (!layout) throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
  } catch { throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID"); }
};

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
        bindings.push({ kind: "resolved", skill: contextual.skill, source: contextual.source });
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

  resolveForAgentDetailed(
    agentDefinition: AgentDefinition | null | undefined,
    catalog: SkillCatalogLookup,
  ): DetailedConfiguredSkillResolution[] {
    if (!agentDefinition) return [];
    const ownBundle = resolvesFromOwnBundle(agentDefinition);
    const outcomes: DetailedConfiguredSkillResolution[] = [];
    for (const rawName of agentDefinition.skillNames ?? []) {
      const name = typeof rawName === "string" ? rawName.trim() : "";
      if (!name || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) {
        outcomes.push({ kind: "invalid_candidate", name, reason: "unsafe_name" });
        continue;
      }
      const bundled = ownBundle
        ? this.resolveDetailedCandidates(name, this.bundleCandidates(name, agentDefinition.sourceInfo ?? null))
        : null;
      if (bundled) {
        outcomes.push(bundled);
        continue;
      }
      const record = catalog(name);
      outcomes.push(record ? this.resolveInstalledRecordDetailed(record) : { kind: "certified_absent", name });
    }
    return outcomes;
  }

  private bundleCandidates(name: string, sourceInfo: AgentDefinitionSourceInfo | null): DetailedCandidate[] {
    const candidates: DetailedCandidate[] = [];
    const agentDir = this.normalizeDetailedRoot(sourceInfo?.agentDirPath);
    const teamDir = this.normalizeDetailedRoot(sourceInfo?.teamDirPath);
    if (agentDir) candidates.push({ path: path.join(agentDir, "skills", name), origin: "agent_private",
      trustedRoot: teamDir ?? agentDir, configuredRoot: teamDir ?? agentDir });
    if (teamDir) candidates.push({ path: path.join(teamDir, "skills", name), origin: "team_shared",
      trustedRoot: teamDir, configuredRoot: teamDir });
    return candidates;
  }

  /** Regular binding for one catalog record: its real origin and trusted root, no name lookup. */
  bindInstalledRecord(record: InstalledSkillRecord): ConfiguredAgentSkillBinding {
    return {
      kind: "resolved",
      skill: record.skill,
      source: this.sourceFor(record.origin, record.skill, record.trustedRoot),
    };
  }

  /** Detailed (AGY) resolution for one catalog record. The existing candidate checks
   * (provenance, source safety, manifest/name, fingerprint) run on a candidate built
   * from the record's real path and roots. */
  resolveInstalledRecordDetailed(record: InstalledSkillRecord): DetailedConfiguredSkillResolution {
    const name = record.skill.name;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) {
      return { kind: "invalid_candidate", name, reason: "unsafe_name" };
    }
    // Bundled layouts are keyed by folder name; a folder whose manifest declares
    // another name is a manifest/name mismatch, not a provenance breach.
    if (record.origin !== "global" && path.basename(record.skill.rootPath) !== name) {
      return { kind: "invalid_candidate", name, reason: "name_mismatch" };
    }
    return this.resolveDetailedCandidates(name, [{
      path: record.skill.rootPath,
      origin: record.origin,
      trustedRoot: record.trustedRoot,
      configuredRoot: record.configuredRoot,
    }]) ?? { kind: "certified_absent", name };
  }

  private resolveDetailedCandidates(name: string, candidates: DetailedCandidate[]): DetailedConfiguredSkillResolution | null {
    for (const candidate of candidates) {
      try { fs.lstatSync(candidate.path); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
      }
      assertDetailedCandidateProvenance(candidate, name);
      try { assertConfiguredSkillSourceSafety(candidate.path, candidate.trustedRoot); }
      catch (error) {
        if (error instanceof Error && error.message === "CONFIGURED_SKILL_SOURCE_TOO_LARGE")
          throw safetyFailure("AGY_SKILL_SOURCE_TOO_LARGE");
        throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
      }
      const manifest = path.join(candidate.path, "SKILL.md");
      let manifestStat: fs.Stats;
      try { manifestStat = fs.lstatSync(manifest); }
      catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return { kind: "invalid_candidate", name, reason: "missing_manifest" };
        if (code === "EACCES" || code === "EPERM") return { kind: "invalid_candidate", name, reason: "unreadable_manifest" };
        throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
      }
      if (manifestStat.isSymbolicLink()) {
        try {
          if (!contains(fs.realpathSync(candidate.trustedRoot), fs.realpathSync(manifest)))
            throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
        } catch { throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID"); }
      } else if (!manifestStat.isFile()) return { kind: "invalid_candidate", name, reason: "malformed_manifest" };
      let contents: string;
      try { contents = fs.readFileSync(manifest, "utf8"); }
      catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EACCES" || code === "EPERM" || code === "ENOENT")
          return { kind: "invalid_candidate", name, reason: "unreadable_manifest" };
        throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
      }
      let declaredName: string;
      try { declaredName = this.loader.parseFrontmatter(contents).metadata.name; }
      catch { return { kind: "invalid_candidate", name, reason: "malformed_manifest" }; }
      if (declaredName !== name) return { kind: "invalid_candidate", name, reason: "name_mismatch" };
      let skill: Skill;
      try { skill = this.loader.loadSkill(candidate.path, this.isReadonlyPath(candidate.path)); }
      catch { throw safetyFailure("AGY_SKILL_SOURCE_CHANGED"); }
      if (skill.name !== name) throw safetyFailure("AGY_SKILL_SOURCE_CHANGED");
      let source: ConfiguredSkillSource;
      let sourceTreeSha256: string;
      try {
        source = this.sourceFor(candidate.origin, skill, candidate.trustedRoot);
        sourceTreeSha256 = fingerprintConfiguredSkillSource(candidate.path, candidate.trustedRoot);
      } catch (error) {
        if (error instanceof Error && error.message === "CONFIGURED_SKILL_SOURCE_TOO_LARGE")
          throw safetyFailure("AGY_SKILL_SOURCE_TOO_LARGE");
        throw safetyFailure("AGY_SKILL_SOURCE_PROVENANCE_INVALID");
      }
      skill.isDisabled = this.isSkillDisabled(name);
      return { kind: "resolved", skill, source, sourceTreeSha256 };
    }
    return null;
  }

  private normalizeDetailedRoot(directoryPath: string | null | undefined): string | null {
    if (!directoryPath) return null;
    try {
      if (!fs.statSync(directoryPath).isDirectory()) throw safetyFailure("AGY_SKILL_SOURCE_ROOT_INVALID");
      return path.resolve(directoryPath);
    } catch { throw safetyFailure("AGY_SKILL_SOURCE_ROOT_INVALID"); }
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
