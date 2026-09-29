import fs from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { DirectoryTraversal } from "../../file-explorer/directory-traversal.js";
import { TreeNode } from "../../file-explorer/tree-node.js";
import { getServerSettingsService } from "../../services/server-settings-service.js";
import {
  normalizeAgentSkillScope,
  type AgentDefinition,
  type AgentSkillScope,
} from "../../agent-definition/domain/models.js";
import { Skill, SkillSourceInfo } from "../domain/models.js";
import { DisabledSkillsStore } from "../disabled-skills-store.js";
import { SkillLoader } from "../loader.js";
import {
  scanBundledSkillsFromDefinitionRoot,
  scanSkillDirectory,
} from "./skill-discovery.js";
import { ConfiguredAgentSkillResolver } from "./configured-agent-skill-resolver.js";
import {
  buildSkillCatalog,
  listSkillCatalogSources,
  scanSkillCatalogSource,
  validateIncomingSkills,
  type SkillCatalog,
  type SkillCatalogSource,
} from "./skill-catalog.js";
import { createRuntimeDefaultSkillFolderMatcher } from "./runtime-default-skill-folders.js";
import type {
  InstalledSkillRecord,
  SkillNameIssue,
  SkillNameValidation,
} from "../domain/installed-skill-record.js";
import { SkillNameConflictError } from "../domain/skill-name-conflict-error.js";
import {
  collectResolvedConfiguredSkills,
  type ConfiguredAgentSkillBinding,
  type DetailedConfiguredSkillResolution,
} from "../domain/configured-agent-skill-binding.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AppConfigLike = {
  getSkillsDir(): string;
  getAdditionalSkillsDirs(): string[];
  getAdditionalAgentPackageRoots(): string[];
  getAppDataDir(): string;
  get(key: string, defaultValue?: string): string | undefined;
};

type SkillServiceOptions = {
  config?: AppConfigLike;
  loader?: SkillLoader;
  disabledStore?: DisabledSkillsStore;
  /** Realpath matcher for runtime default skill folders (tier 4); defaults to the real folders. */
  isRuntimeDefaultSkillFolder?: (directory: string) => boolean;
};

/** An incoming skill source to check before it is committed (REQ-023). */
export type IncomingSkillSource = Pick<SkillCatalogSource, "path" | "layout"> & {
  /** Tier 2 for agent packages; added folders get tier 3 or 4 from the runtime default matcher. */
  tier?: SkillCatalogSource["tier"];
};

export type SkillCatalogReloadResult = {
  skills: Skill[];
  skillSources: SkillSourceInfo[];
};

export class SkillService {
  private static instance: SkillService | null = null;

  static getInstance(options: SkillServiceOptions = {}): SkillService {
    if (!SkillService.instance) {
      SkillService.instance = new SkillService(options);
    }
    return SkillService.instance;
  }

  static resetInstance(): void {
    SkillService.instance = null;
  }

  readonly config: AppConfigLike;
  readonly skillsDir: string;
  private loader: SkillLoader;
  private disabledStore: DisabledSkillsStore;
  private readonly isRuntimeDefaultSkillFolder: (directory: string) => boolean;
  private loggedIssueSignature = "";

  constructor(options: SkillServiceOptions = {}) {
    this.config = options.config ?? appConfigProvider.config;
    this.skillsDir = this.config.getSkillsDir();
    this.loader = options.loader ?? new SkillLoader();

    const disabledSkillsPath = path.join(this.config.getAppDataDir(), "disabled_skills.json");
    this.disabledStore = options.disabledStore ?? new DisabledSkillsStore(disabledSkillsPath);
    this.isRuntimeDefaultSkillFolder = options.isRuntimeDefaultSkillFolder
      ?? createRuntimeDefaultSkillFolderMatcher();
  }

  private isReadonlyPath(skillPath: string): boolean {
    try {
      fs.accessSync(skillPath, fs.constants.W_OK);
    } catch {
      return true;
    }

    const skillMdPath = path.join(skillPath, "SKILL.md");
    if (fs.existsSync(skillMdPath)) {
      try {
        fs.accessSync(skillMdPath, fs.constants.W_OK);
      } catch {
        return true;
      }
    }

    return false;
  }

  /**
   * Scans every catalog source in precedence order and keeps one copy per name (D-19). The
   * ignored copies are logged whenever the set of issues changes.
   */
  private loadCatalog(): SkillCatalog {
    const dependencies = this.getDiscoveryDependencies();
    const catalog = buildSkillCatalog(
      listSkillCatalogSources(this.config, this.isRuntimeDefaultSkillFolder)
        .flatMap((source) => scanSkillCatalogSource(source, dependencies)),
    );
    for (const record of catalog.records) {
      record.skill.isDisabled = this.disabledStore.isDisabled(record.skill.name);
    }
    this.logSkillNameIssues(catalog.issues);
    return catalog;
  }

  private logSkillNameIssues(issues: readonly SkillNameIssue[]): void {
    const signature = JSON.stringify(issues);
    if (signature === this.loggedIssueSignature) return;
    this.loggedIssueSignature = signature;
    for (const issue of issues) {
      logger.warn(`Skill name '${issue.name}' (${issue.kind}): using '${issue.usedPath}', ignoring ${issue.ignoredPaths.map((ignored) => `'${ignored}'`).join(", ")}.`);
    }
  }

  /** The installed skill catalog: exactly one record (the used copy) per name, sorted by name. */
  listInstalledSkillRecords(): InstalledSkillRecord[] {
    return [...this.loadCatalog().records].sort((a, b) => a.skill.name.localeCompare(b.skill.name));
  }

  /** The copies the catalog ignores, for the Skills page banner (REQ-024). */
  listSkillNameIssues(): SkillNameIssue[] {
    return this.loadCatalog().issues;
  }

  /** The used copy of a name. Every name-based operation goes through this (AR-013). */
  resolveCatalogRecord(name: string): InstalledSkillRecord | null {
    return this.loadCatalog().records.find((record) => record.skill.name === name) ?? null;
  }

  listSkills(): Skill[] {
    return this.listInstalledSkillRecords().map((record) => record.skill);
  }

  reloadSkillCatalog(): SkillCatalogReloadResult {
    return {
      skills: this.listSkills(),
      skillSources: this.getSkillSources(),
    };
  }

  getSkill(name: string): Skill | null {
    return this.resolveCatalogRecord(name)?.skill ?? null;
  }

  /**
   * Checks an incoming source against the installed skills before the caller commits it
   * (REQ-023). Its own folders are not counted as existing copies, so reloading or updating a
   * package in place only conflicts with other sources.
   */
  validateIncomingSkillNames(incoming: IncomingSkillSource): SkillNameValidation {
    const tier = incoming.tier ?? (this.isRuntimeDefaultSkillFolder(incoming.path) ? 4 : 3);
    const dependencies = this.getDiscoveryDependencies();
    return validateIncomingSkills(
      this.loadCatalog().candidates,
      scanSkillCatalogSource({ path: incoming.path, layout: incoming.layout, tier }, dependencies),
    );
  }

  /** Throws `SkillNameConflictError` on a duplicate among tiers 1–3; logs tier-4 notices. */
  assertNoIncomingSkillNameConflicts(incoming: IncomingSkillSource): SkillNameValidation {
    const validation = this.validateIncomingSkillNames(incoming);
    if (validation.conflicts.length > 0) throw new SkillNameConflictError(validation.conflicts);
    for (const notice of validation.notices) {
      logger.info(`Skill '${notice.name}': '${notice.usedPath}' takes precedence; ignoring the runtime default copy '${notice.ignoredPath}'.`);
    }
    return validation;
  }

  getSkills(skillNames: string[]): Skill[] {
    const records = new Map(this.loadCatalog().records.map((record) => [record.skill.name, record]));
    const skills: Skill[] = [];

    for (const rawSkillName of skillNames) {
      const skillName =
        typeof rawSkillName === "string" && rawSkillName.trim().length > 0
          ? rawSkillName.trim()
          : null;
      if (!skillName) {
        continue;
      }

      const skill = records.get(skillName)?.skill;
      if (!skill) {
        logger.warn(`Skill '${skillName}' could not be resolved via SkillService. Skipping.`);
        continue;
      }

      skills.push(skill);
    }

    return skills;
  }

  resolveConfiguredSkillsForAgent(agentDefinition: AgentDefinition | null | undefined): Skill[] {
    return collectResolvedConfiguredSkills(
      this.resolveConfiguredSkillBindingsForAgent(agentDefinition),
    );
  }

  /**
   * The definition's normalized skill scope. Runtimes derive their workspace skill request
   * strength from this (D-15); they never read `skillScope` themselves.
   */
  resolveSkillScope(agentDefinition: AgentDefinition | null | undefined): AgentSkillScope {
    return normalizeAgentSkillScope(agentDefinition?.skillScope);
  }

  /** Effective skill bindings for a definition after applying its skill scope. */
  resolveConfiguredSkillBindingsForAgent(
    agentDefinition: AgentDefinition | null | undefined,
  ): ConfiguredAgentSkillBinding[] {
    if (!agentDefinition) {
      return [];
    }
    const resolver = this.createConfiguredSkillResolver();
    const records = this.listInstalledSkillRecords();
    if (this.resolveSkillScope(agentDefinition) === "ALL_INSTALLED") {
      return records.filter((record) => !record.skill.isDisabled).map((record) =>
        resolver.bindInstalledRecord(record));
    }
    return resolver.resolveForAgent(agentDefinition, catalogLookup(records));
  }

  /** Effective, cause-certified skill resolutions (AGY) after applying the skill scope. */
  resolveConfiguredSkillBindingsForAgentDetailed(
    agentDefinition: AgentDefinition | null | undefined,
  ): DetailedConfiguredSkillResolution[] {
    if (!agentDefinition) {
      return [];
    }
    const resolver = this.createConfiguredSkillResolver();
    const records = this.listInstalledSkillRecords();
    if (this.resolveSkillScope(agentDefinition) === "ALL_INSTALLED") {
      return records.filter((record) => !record.skill.isDisabled).map((record) =>
        resolver.resolveInstalledRecordDetailed(record));
    }
    return resolver.resolveForAgentDetailed(agentDefinition, catalogLookup(records));
  }

  /** Whether a definition runs with any skills once its skill scope is applied. */
  hasEffectiveSkills(agentDefinition: AgentDefinition | null | undefined): boolean {
    if (!agentDefinition) {
      return false;
    }
    if (this.resolveSkillScope(agentDefinition) === "ALL_INSTALLED") {
      return this.listInstalledSkillRecords().some((record) => !record.skill.isDisabled);
    }
    return (agentDefinition.skillNames ?? []).some(
      (name) => typeof name === "string" && name.trim().length > 0,
    );
  }

  private createConfiguredSkillResolver(): ConfiguredAgentSkillResolver {
    return new ConfiguredAgentSkillResolver({
      loader: this.loader,
      isReadonlyPath: this.isReadonlyPath.bind(this),
      isSkillDisabled: this.disabledStore.isDisabled.bind(this.disabledStore),
      logger,
    });
  }

  createSkill(name: string, description: string, content: string): Skill {
    if (!name || !/^[A-Za-z0-9_-]+$/.test(name)) {
      throw new Error(`Invalid skill name: ${name}`);
    }

    const skillPath = path.join(this.skillsDir, name);
    // The name must be free across tiers 1–3, this folder included (REQ-023); a runtime default
    // copy is only shadowed.
    const existing = this.loadCatalog().candidates.find((record) =>
      record.skill.name === name && record.tier !== 4);
    if (existing) {
      throw new SkillNameConflictError([{ name, existingPath: existing.skill.rootPath, incomingPath: skillPath }]);
    }
    if (fs.existsSync(skillPath)) {
      throw new Error(`Skill folder '${skillPath}' already exists`);
    }

    fs.mkdirSync(skillPath, { recursive: true });

    const skillMd = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}\n`;
    fs.writeFileSync(path.join(skillPath, "SKILL.md"), skillMd, "utf-8");

    return this.loader.loadSkill(skillPath, this.isReadonlyPath(skillPath));
  }

  updateSkill(name: string, description?: string | null, content?: string | null): Skill {
    const skill = this.getSkill(name);
    if (!skill) {
      throw new Error(`Skill '${name}' not found`);
    }

    if (skill.isReadonly) {
      throw new Error(
        `Cannot update skill '${name}': it is from an external source and is read-only`,
      );
    }

    if (description !== undefined || content !== undefined) {
      const newDescription = description ?? skill.description;
      const newContent = content ?? skill.content;
      const skillMd = `---\nname: ${name}\ndescription: ${newDescription}\n---\n\n${newContent}\n`;
      fs.writeFileSync(path.join(skill.rootPath, "SKILL.md"), skillMd, "utf-8");
    }

    return this.getSkill(name)!;
  }

  deleteSkill(name: string): boolean {
    const skill = this.getSkill(name);
    if (!skill) {
      return false;
    }

    if (skill.isReadonly) {
      throw new Error(
        `Cannot delete skill '${name}': it is from an external source and is read-only`,
      );
    }

    fs.rmSync(skill.rootPath, { recursive: true, force: true });
    return true;
  }

  disableSkill(name: string): Skill {
    const skill = this.getSkill(name);
    if (!skill) {
      throw new Error(`Skill '${name}' not found`);
    }

    this.disabledStore.add(name);
    skill.isDisabled = true;
    return skill;
  }

  enableSkill(name: string): Skill {
    const skill = this.getSkill(name);
    if (!skill) {
      throw new Error(`Skill '${name}' not found`);
    }

    this.disabledStore.remove(name);
    skill.isDisabled = false;
    return skill;
  }

  getDisabledSkills(): string[] {
    return this.disabledStore.getDisabledSkills();
  }

  async getSkillFileTree(name: string): Promise<TreeNode> {
    const skill = this.getSkill(name);
    if (!skill) {
      throw new Error(`Skill '${name}' not found`);
    }

    const traversal = new DirectoryTraversal();
    return traversal.buildTree(skill.rootPath);
  }

  uploadFile(skillName: string, relativePath: string, content: Buffer | Uint8Array | string): boolean {
    const skill = this.getSkill(skillName);
    if (!skill) {
      throw new Error(`Skill '${skillName}' not found`);
    }

    const filePath = path.join(skill.rootPath, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const payload = typeof content === "string" ? Buffer.from(content, "utf-8") : Buffer.from(content);
    fs.writeFileSync(filePath, payload);
    return true;
  }

  readFile(skillName: string, relativePath: string): Buffer {
    const skill = this.getSkill(skillName);
    if (!skill) {
      throw new Error(`Skill '${skillName}' not found`);
    }

    const filePath = path.join(skill.rootPath, relativePath);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${relativePath}`);
    }

    return fs.readFileSync(filePath);
  }

  deleteFile(skillName: string, relativePath: string): boolean {
    const skill = this.getSkill(skillName);
    if (!skill) {
      throw new Error(`Skill '${skillName}' not found`);
    }

    const filePath = path.join(skill.rootPath, relativePath);
    if (!fs.existsSync(filePath)) {
      return false;
    }

    if (fs.statSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }

    return true;
  }

  private countSkillsInSourceDirectory(directory: string): number {
    if (!fs.existsSync(directory)) {
      return 0;
    }

    try {
      const seen = new Set<string>();
      for (const record of [
        ...scanSkillDirectory(directory, this.getDiscoveryDependencies()),
        ...scanBundledSkillsFromDefinitionRoot(directory, this.getDiscoveryDependencies()),
      ]) {
        seen.add(record.skill.name);
      }
      return seen.size;
    } catch {
      return 0;
    }
  }

  getSkillSources(): SkillSourceInfo[] {
    const sources: SkillSourceInfo[] = [];

    sources.push(
      new SkillSourceInfo({
        path: this.skillsDir,
        skillCount: this.countSkillsInSourceDirectory(this.skillsDir),
        isDefault: true,
      }),
    );

    const additionalDirs = this.config.getAdditionalSkillsDirs();
    for (const directory of additionalDirs) {
      sources.push(
        new SkillSourceInfo({
          path: directory,
          skillCount: this.countSkillsInSourceDirectory(directory),
          isDefault: false,
        }),
      );
    }

    return sources;
  }

  addSkillSource(pathStr: string): SkillSourceInfo[] {
    const resolved = path.resolve(pathStr);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Directory not found: ${resolved}`);
    }
    if (!fs.statSync(resolved).isDirectory()) {
      throw new Error(`Path is not a directory: ${resolved}`);
    }

    if (path.resolve(this.skillsDir) === resolved) {
      throw new Error("Path is already the default skill directory");
    }

    const currentSources = this.config.getAdditionalSkillsDirs();
    if (currentSources.some((entry) => path.resolve(entry) === resolved)) {
      throw new Error("Skill source already exists");
    }

    this.assertNoIncomingSkillNameConflicts({ path: resolved, layout: "skill_path" });

    const rawEnv = this.config.get("AUTOBYTEUS_SKILLS_PATHS", "");
    const newEnvValue = rawEnv ? `${rawEnv},${resolved}` : resolved;

    const [success, msg] = getServerSettingsService().updateSetting(
      "AUTOBYTEUS_SKILLS_PATHS",
      newEnvValue,
    );
    if (!success) {
      throw new Error(`Failed to update configuration: ${msg}`);
    }

    return this.getSkillSources();
  }

  removeSkillSource(pathStr: string): SkillSourceInfo[] {
    const resolved = path.resolve(pathStr);
    if (path.resolve(this.skillsDir) === resolved) {
      throw new Error("Cannot remove default skill directory");
    }

    const currentSources = this.config.getAdditionalSkillsDirs();
    const remaining: string[] = [];
    let found = false;

    for (const source of currentSources) {
      if (path.resolve(source) === resolved) {
        found = true;
      } else {
        remaining.push(source);
      }
    }

    if (!found) {
      throw new Error(`Skill source not found: ${resolved}`);
    }

    const newEnvValue = remaining.join(",");
    const [success, msg] = getServerSettingsService().updateSetting(
      "AUTOBYTEUS_SKILLS_PATHS",
      newEnvValue,
    );
    if (!success) {
      throw new Error(`Failed to update configuration: ${msg}`);
    }

    return this.getSkillSources();
  }

  private getDiscoveryDependencies() {
    return {
      loader: this.loader,
      isReadonlyPath: this.isReadonlyPath.bind(this),
      logger,
    };
  }
}

const catalogLookup = (records: readonly InstalledSkillRecord[]) => {
  const byName = new Map(records.map((record) => [record.skill.name, record]));
  return (name: string): InstalledSkillRecord | null => byName.get(name) ?? null;
};
