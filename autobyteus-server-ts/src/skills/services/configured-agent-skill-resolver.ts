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
import { assertConfiguredSkillSourceSafety, fingerprintConfiguredSkillSource } from "./configured-skill-source-fingerprint.js";

type ConfiguredAgentSkillResolverOptions = {
  loader: SkillLoader;
  isReadonlyPath: (skillPath: string) => boolean;
  resolveGlobalSkill: (name: string) => Skill | null;
  globalCandidatePaths?: (name: string) => { path: string; configuredRoot: string }[];
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
  private readonly resolveGlobalSkill: (name: string) => Skill | null;
  private readonly globalCandidatePaths: (name: string) => { path: string; configuredRoot: string }[];
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
      const candidates: DetailedCandidate[] = [];
      const agentDir = this.normalizeDetailedRoot(sourceInfo?.agentDirPath);
      const teamDir = this.normalizeDetailedRoot(sourceInfo?.teamDirPath);
      if (agentDir) candidates.push({ path: path.join(agentDir, "skills", name), origin: "agent_private",
        trustedRoot: teamDir ?? agentDir, configuredRoot: teamDir ?? agentDir });
      if (teamDir) candidates.push({ path: path.join(teamDir, "skills", name), origin: "team_shared",
        trustedRoot: teamDir, configuredRoot: teamDir });
      let outcome = this.resolveDetailedCandidates(name, candidates);
      if (!outcome) {
        let globals: ReturnType<typeof this.globalCandidatePaths>;
        try { globals = this.globalCandidatePaths(name); }
        catch (error) {
          if (error instanceof Error && error.message === "AGY_SKILL_SOURCE_PROVENANCE_INVALID") throw error;
          throw safetyFailure("AGY_SKILL_SOURCE_ROOT_INVALID");
        }
        outcome = this.resolveDetailedCandidates(name, globals.map((candidate) => ({
          path: candidate.path, origin: "global", trustedRoot: candidate.path,
          configuredRoot: candidate.configuredRoot,
        })));
      }
      outcomes.push(outcome ?? { kind: "certified_absent", name });
    }
    return outcomes;
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
