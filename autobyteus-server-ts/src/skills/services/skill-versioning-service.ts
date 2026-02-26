import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SkillVersion } from "../domain/skill-version.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

export const INITIAL_VERSION_TAG = "0.1.0";
export const INITIAL_VERSION_MESSAGE = "Initial version";

type GitRunOptions = {
  env?: NodeJS.ProcessEnv;
  trim?: boolean;
};

export class SkillVersioningService {
  private static instance: SkillVersioningService | null = null;

  static getInstance(): SkillVersioningService {
    if (!SkillVersioningService.instance) {
      SkillVersioningService.instance = new SkillVersioningService();
    }
    return SkillVersioningService.instance;
  }

  static resetInstance(): void {
    SkillVersioningService.instance = null;
  }

  private runGit(commandArgs: string[], cwd: string, options: GitRunOptions = {}): string {
    try {
      const output = execFileSync("git", commandArgs, {
        cwd,
        env: { ...process.env, ...options.env },
        encoding: "utf-8",
      });
      return options.trim === false ? output : output.trim();
    } catch (error) {
      if (error && typeof error === "object") {
        const err = error as NodeJS.ErrnoException & {
          stdout?: string | Buffer;
          status?: number | null;
        };
        if (err.code === "EPERM" && err.status === 0 && err.stdout !== undefined) {
          const output = typeof err.stdout === "string" ? err.stdout : err.stdout.toString("utf-8");
          return options.trim === false ? output : output.trim();
        }
      }
      const message = `Git command failed: git ${commandArgs.join(" ")} (${String(error)})`;
      throw new Error(message);
    }
  }

  isVersioned(skillPath: string): boolean {
    const gitDir = path.join(skillPath, ".git");
    return fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory();
  }

  initRepo(skillPath: string): boolean {
    if (this.isVersioned(skillPath)) {
      throw new Error(`Skill at '${skillPath}' is already versioned`);
    }
    this.runGit(["init"], skillPath);
    logger.info(`Initialized git repository at ${skillPath}`);
    return true;
  }

  initializeVersioning(
    skillPath: string,
    tag: string = INITIAL_VERSION_TAG,
    message: string = INITIAL_VERSION_MESSAGE,
  ): SkillVersion {
    this.initRepo(skillPath);
    return this.createVersion(skillPath, tag, message);
  }

  createVersion(
    skillPath: string,
    tag: string,
    message: string,
    authorName: string = "AutoByteus",
    authorEmail: string = "agent@autobyteus.com",
  ): SkillVersion {
    if (!this.isVersioned(skillPath)) {
      throw new Error(`Skill at '${skillPath}' is not versioned. Call initRepo first.`);
    }

    const tagExists = this.runGit(["tag", "--list", tag], skillPath);
    if (tagExists) {
      throw new Error(`Tag '${tag}' already exists`);
    }

    const gitEnv = {
      GIT_AUTHOR_NAME: authorName,
      GIT_AUTHOR_EMAIL: authorEmail,
      GIT_COMMITTER_NAME: authorName,
      GIT_COMMITTER_EMAIL: authorEmail,
    };

    this.runGit(["add", "."], skillPath);
    this.runGit(["commit", "-m", message], skillPath, { env: gitEnv });
    this.runGit(["tag", "-a", tag, "-m", message], skillPath, { env: gitEnv });

    const commitHash = this.runGit(["rev-parse", "HEAD"], skillPath).slice(0, 7);
    logger.info(`Created version ${tag} at ${skillPath}`);

    return new SkillVersion({
      tag,
      commitHash,
      message,
      createdAt: new Date(),
      isActive: true,
    });
  }

  listVersions(skillPath: string): SkillVersion[] {
    if (!this.isVersioned(skillPath)) {
      return [];
    }

    const tagsOutput = this.runGit(["tag", "--list"], skillPath);
    if (!tagsOutput) {
      return [];
    }

    const tags = tagsOutput.split(/\r?\n/).filter(Boolean);
    const headSha = this.runGit(["rev-parse", "HEAD"], skillPath);

    const versions = tags.map((tag) => {
      const commitSha = this.runGit(["rev-parse", `${tag}^{}`], skillPath);
      const message =
        this.runGit(["tag", "-l", "--format=%(contents:subject)", tag], skillPath) ?? "";
      const dateStr = this.runGit(["log", "-1", "--format=%cI", `${tag}^{}`], skillPath);
      const createdAt = dateStr ? new Date(dateStr) : new Date();
      const isActive = headSha === commitSha;

      return new SkillVersion({
        tag,
        commitHash: commitSha.slice(0, 7),
        message: message.trim(),
        createdAt,
        isActive,
      });
    });

    versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return versions;
  }

  getActiveVersion(skillPath: string): SkillVersion | null {
    const versions = this.listVersions(skillPath);
    return versions.find((version) => version.isActive) ?? null;
  }

  activateVersion(skillPath: string, tag: string): SkillVersion {
    if (!this.isVersioned(skillPath)) {
      throw new Error(`Skill at '${skillPath}' is not versioned`);
    }

    const tagExists = this.runGit(["tag", "--list", tag], skillPath);
    if (!tagExists) {
      throw new Error(`Tag '${tag}' not found`);
    }

    const commitSha = this.runGit(["rev-parse", `${tag}^{}`], skillPath);
    this.runGit(["reset", "--hard", commitSha], skillPath, { trim: false });
    logger.info(`Activated version ${tag} at ${skillPath}`);

    const versions = this.listVersions(skillPath);
    const found = versions.find((version) => version.tag === tag);
    if (found) {
      return found;
    }

    return new SkillVersion({
      tag,
      commitHash: commitSha.slice(0, 7),
      message: "",
      createdAt: new Date(),
      isActive: true,
    });
  }

  diffVersions(skillPath: string, fromVersion: string, toVersion: string): string {
    if (!this.isVersioned(skillPath)) {
      throw new Error(`Skill at '${skillPath}' is not versioned`);
    }

    const fromExists = this.runGit(["tag", "--list", fromVersion], skillPath);
    if (!fromExists) {
      throw new Error(`Tag '${fromVersion}' not found`);
    }

    const toExists = this.runGit(["tag", "--list", toVersion], skillPath);
    if (!toExists) {
      throw new Error(`Tag '${toVersion}' not found`);
    }

    return this.runGit(["diff", fromVersion, toVersion], skillPath, { trim: false });
  }
}
