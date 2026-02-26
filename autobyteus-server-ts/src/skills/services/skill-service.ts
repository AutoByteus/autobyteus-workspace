import fs from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { DirectoryTraversal } from "../../file-explorer/directory-traversal.js";
import { TreeNode } from "../../file-explorer/tree-node.js";
import { getServerSettingsService } from "../../services/server-settings-service.js";
import { Skill, SkillSourceInfo } from "../domain/models.js";
import { DisabledSkillsStore } from "../disabled-skills-store.js";
import { SkillLoader } from "../loader.js";
import { SkillVersioningService } from "./skill-versioning-service.js";
import type { SkillVersion } from "../domain/skill-version.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type AppConfigLike = {
  getSkillsDir(): string;
  getAdditionalSkillsDirs(): string[];
  getAppDataDir(): string;
  get(key: string, defaultValue?: string): string | undefined;
};

type SkillServiceOptions = {
  config?: AppConfigLike;
  loader?: SkillLoader;
  disabledStore?: DisabledSkillsStore;
  versioningService?: SkillVersioningService;
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
  private versioningService: SkillVersioningService;

  constructor(options: SkillServiceOptions = {}) {
    this.config = options.config ?? appConfigProvider.config;
    this.skillsDir = this.config.getSkillsDir();
    this.loader = options.loader ?? new SkillLoader();
    this.versioningService = options.versioningService ?? SkillVersioningService.getInstance();

    const disabledSkillsPath = path.join(this.config.getAppDataDir(), "disabled_skills.json");
    this.disabledStore = options.disabledStore ?? new DisabledSkillsStore(disabledSkillsPath);
  }

  private findSkillLocation(name: string): string | null {
    for (const directory of this.getAllSkillDirectories()) {
      const match = this.searchDirectoryRecursive(directory, name);
      if (match) {
        return match;
      }
    }
    return null;
  }

  private searchDirectoryRecursive(directory: string, name: string): string | null {
    if (!fs.existsSync(directory)) {
      return null;
    }

    const candidate = path.join(directory, name);
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, "SKILL.md"))) {
      return candidate;
    }

    const nestedSkills = path.join(directory, "skills");
    if (fs.existsSync(nestedSkills) && fs.statSync(nestedSkills).isDirectory()) {
      return this.searchDirectoryRecursive(nestedSkills, name);
    }

    return null;
  }

  private scanDirectory(directory: string): Skill[] {
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
      if (!fs.existsSync(path.join(itemPath, "SKILL.md"))) {
        continue;
      }
      try {
        const skill = this.loader.loadSkill(
          itemPath,
          this.isReadonlyPath(itemPath),
        );
        skills.push(skill);
      } catch (error) {
        logger.warn(`Error loading skill ${entry.name}: ${String(error)}`);
      }
    }

    const nestedSkillsDir = path.join(directory, "skills");
    if (fs.existsSync(nestedSkillsDir) && fs.statSync(nestedSkillsDir).isDirectory()) {
      const nestedSkills = this.scanDirectory(nestedSkillsDir);
      skills.push(...nestedSkills);
    }

    return skills;
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

  private getAllSkillDirectories(): string[] {
    const dirs = [this.skillsDir];
    dirs.push(...this.config.getAdditionalSkillsDirs());
    return dirs;
  }

  listSkills(): Skill[] {
    const skills: Skill[] = [];
    const seen = new Set<string>();

    for (const directory of this.getAllSkillDirectories()) {
      for (const skill of this.scanDirectory(directory)) {
        if (seen.has(skill.name)) {
          continue;
        }
        skill.isDisabled = this.disabledStore.isDisabled(skill.name);
        skills.push(skill);
        seen.add(skill.name);
      }
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name));
  }

  getSkill(name: string): Skill | null {
    const skillPath = this.findSkillLocation(name);
    if (!skillPath) {
      return null;
    }
    const skill = this.loader.loadSkill(skillPath, this.isReadonlyPath(skillPath));
    skill.isDisabled = this.disabledStore.isDisabled(skill.name);
    return skill;
  }

  createSkill(name: string, description: string, content: string): Skill {
    if (!name || !/^[A-Za-z0-9_-]+$/.test(name)) {
      throw new Error(`Invalid skill name: ${name}`);
    }

    const skillPath = path.join(this.skillsDir, name);
    if (fs.existsSync(skillPath)) {
      throw new Error(`Skill '${name}' already exists`);
    }

    fs.mkdirSync(skillPath, { recursive: true });

    const skillMd = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}\n`;
    fs.writeFileSync(path.join(skillPath, "SKILL.md"), skillMd, "utf-8");

    try {
      this.versioningService.initializeVersioning(skillPath);
    } catch (error) {
      fs.rmSync(skillPath, { recursive: true, force: true });
      throw error;
    }

    return this.loader.loadSkill(skillPath, this.isReadonlyPath(skillPath));
  }

  enableSkillVersioning(name: string): SkillVersion {
    const skill = this.getSkill(name);
    if (!skill) {
      throw new Error(`Skill '${name}' not found`);
    }

    if (skill.isReadonly) {
      throw new Error(
        `Cannot enable versioning for skill '${name}': it is read-only`,
      );
    }

    return this.versioningService.initializeVersioning(skill.rootPath);
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

  getSkillSources(): SkillSourceInfo[] {
    const sources: SkillSourceInfo[] = [];

    let defaultCount = 0;
    if (fs.existsSync(this.skillsDir)) {
      try {
        defaultCount = this.scanDirectory(this.skillsDir).length;
      } catch {
        defaultCount = 0;
      }
    }

    sources.push(
      new SkillSourceInfo({
        path: this.skillsDir,
        skillCount: defaultCount,
        isDefault: true,
      }),
    );

    const additionalDirs = this.config.getAdditionalSkillsDirs();
    for (const directory of additionalDirs) {
      let count = 0;
      if (fs.existsSync(directory)) {
        try {
          count = this.scanDirectory(directory).length;
        } catch {
          count = 0;
        }
      }

      sources.push(
        new SkillSourceInfo({
          path: directory,
          skillCount: count,
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
}
