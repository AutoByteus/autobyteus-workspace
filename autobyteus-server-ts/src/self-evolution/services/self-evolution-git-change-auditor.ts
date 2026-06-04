import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { SelfEvolutionSkillTarget } from "../domain/models.js";

const execFileAsync = promisify(execFile);

export type SelfEvolutionGitRootSnapshot = {
  gitRootPath: string;
  head: string | null;
  changedPathFingerprints: Record<string, string>;
};

export class SelfEvolutionGitChangeAuditor {
  listGitRoots(skillTargets: SelfEvolutionSkillTarget[]): string[] {
    return Array.from(new Set(skillTargets.flatMap((target) => target.gitRootPath ? [path.resolve(target.gitRootPath)] : [])));
  }

  async snapshotGitRoots(gitRoots: string[]): Promise<SelfEvolutionGitRootSnapshot[]> {
    return Promise.all(gitRoots.map(async (gitRootPath) => ({
      gitRootPath,
      head: await this.readGitHead(gitRootPath),
      changedPathFingerprints: await this.readGitChangedPathFingerprints(gitRootPath),
    })));
  }

  async auditGitRootChanges(input: {
    before: SelfEvolutionGitRootSnapshot[];
    after: SelfEvolutionGitRootSnapshot[];
    editableSkillTargets: SelfEvolutionSkillTarget[];
  }): Promise<{ offTargetChangePaths: string[]; warnings: string[] }> {
    const beforeByRoot = new Map(input.before.map((snapshot) => [snapshot.gitRootPath, snapshot]));
    const allowedByRoot = this.buildAllowedRelativePathsByRoot(input.editableSkillTargets);
    const offTargetChangePaths = new Set<string>();
    const warnings: string[] = [];
    for (const afterRoot of input.after) {
      const beforeRoot = beforeByRoot.get(afterRoot.gitRootPath) ?? {
        gitRootPath: afterRoot.gitRootPath,
        head: null,
        changedPathFingerprints: {},
      };
      const changedPaths = new Set([
        ...this.changedStatusPaths(beforeRoot, afterRoot),
        ...await this.changedCommittedPaths(beforeRoot, afterRoot),
      ]);
      const allowed = allowedByRoot.get(afterRoot.gitRootPath) ?? new Set<string>();
      for (const changedPath of changedPaths) {
        if (!allowed.has(changedPath)) {
          offTargetChangePaths.add(`${afterRoot.gitRootPath}${path.sep}${changedPath}`);
        }
      }
      if (beforeRoot.head && afterRoot.head && beforeRoot.head !== afterRoot.head) {
        warnings.push(`Git HEAD changed in target root '${afterRoot.gitRootPath}' during self-evolution.`);
      }
    }
    return { offTargetChangePaths: Array.from(offTargetChangePaths).sort(), warnings };
  }

  async buildDiffStat(
    before: SelfEvolutionGitRootSnapshot[],
    after: SelfEvolutionGitRootSnapshot[],
  ): Promise<{ text: string | null; warnings: string[] }> {
    const beforeByRoot = new Map(before.map((snapshot) => [snapshot.gitRootPath, snapshot]));
    const chunks: string[] = [];
    const warnings: string[] = [];
    for (const afterRoot of after) {
      const [workingTreeStat, stagedStat] = await Promise.all([
        this.readGitDiff(afterRoot.gitRootPath, ["diff", "--stat"]),
        this.readGitDiff(afterRoot.gitRootPath, ["diff", "--cached", "--stat"]),
      ]);
      const rootChunks = [
        workingTreeStat.trim() ? `Working tree:\n${workingTreeStat.trim()}` : null,
        stagedStat.trim() ? `Staged:\n${stagedStat.trim()}` : null,
      ].filter((entry): entry is string => Boolean(entry));
      const beforeRoot = beforeByRoot.get(afterRoot.gitRootPath);
      if (beforeRoot?.head && afterRoot.head && beforeRoot.head !== afterRoot.head) {
        const committedStat = await this.readGitDiff(afterRoot.gitRootPath, ["diff", "--stat", beforeRoot.head, afterRoot.head]);
        if (committedStat.trim()) {
          rootChunks.push(`Committed HEAD delta:\n${committedStat.trim()}`);
        }
      }
      if (rootChunks.length > 0) {
        chunks.push(`Git root ${afterRoot.gitRootPath}:\n${rootChunks.join("\n")}`);
      }
    }
    return { text: chunks.join("\n\n") || null, warnings };
  }

  buildUnversionedWarnings(editableSkillTargets: SelfEvolutionSkillTarget[]): string[] {
    const unversionedCount = editableSkillTargets.filter((target) => !target.gitRootPath).length;
    return unversionedCount > 0
      ? [`${unversionedCount} editable target skill(s) are not Git-backed; off-target audit is not collectible for those paths.`]
      : [];
  }

  private async readGitHead(gitRootPath: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["-C", gitRootPath, "rev-parse", "HEAD"],
        { timeout: 2_000, maxBuffer: 1024 * 64 },
      );
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  private async readGitChangedPathFingerprints(gitRootPath: string): Promise<Record<string, string>> {
    const statusPaths = await this.readGitStatusPaths(gitRootPath);
    const entries = await Promise.all(statusPaths.map(async (relativePath) => [
      relativePath,
      await this.fingerprintGitPath(gitRootPath, relativePath),
    ] as const));
    return Object.fromEntries(entries);
  }

  private async readGitStatusPaths(gitRootPath: string): Promise<string[]> {
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["-C", gitRootPath, "status", "--porcelain=v1", "-z", "--untracked-files=all"],
        { timeout: 5_000, maxBuffer: 1024 * 512 },
      );
      const parts = stdout.split("\0").filter(Boolean);
      const paths = new Set<string>();
      for (let index = 0; index < parts.length; index += 1) {
        const entry = parts[index];
        const status = entry.slice(0, 2);
        const relativePath = entry.slice(3);
        if (relativePath) {
          paths.add(this.normalizeGitRelativePath(relativePath));
        }
        if ((status[0] === "R" || status[0] === "C") && parts[index + 1]) {
          index += 1;
          paths.add(this.normalizeGitRelativePath(parts[index]));
        }
      }
      return Array.from(paths).sort();
    } catch {
      return [];
    }
  }

  private async fingerprintGitPath(gitRootPath: string, relativePath: string): Promise<string> {
    const [unstagedDiff, stagedDiff, fileHash] = await Promise.all([
      this.readGitDiff(gitRootPath, ["diff", "--binary", "--", relativePath]),
      this.readGitDiff(gitRootPath, ["diff", "--cached", "--binary", "--", relativePath]),
      this.hashWorkingTreePath(path.join(gitRootPath, relativePath)),
    ]);
    return crypto.createHash("sha256")
      .update(JSON.stringify({ relativePath, unstagedDiff, stagedDiff, fileHash }))
      .digest("hex");
  }

  private async readGitDiff(gitRootPath: string, args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["-C", gitRootPath, ...args],
        { timeout: 5_000, maxBuffer: 1024 * 1024 },
      );
      return stdout;
    } catch (error) {
      return `diff-error:${String(error)}`;
    }
  }

  private async hashWorkingTreePath(filePath: string): Promise<string | null> {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        return null;
      }
      const content = await fs.readFile(filePath);
      return crypto.createHash("sha256").update(content).digest("hex");
    } catch {
      return null;
    }
  }

  private buildAllowedRelativePathsByRoot(
    editableSkillTargets: SelfEvolutionSkillTarget[],
  ): Map<string, Set<string>> {
    const allowedByRoot = new Map<string, Set<string>>();
    for (const target of editableSkillTargets) {
      if (!target.gitRootPath) {
        continue;
      }
      const gitRoot = path.resolve(target.gitRootPath);
      const allowed = allowedByRoot.get(gitRoot) ?? new Set<string>();
      allowed.add(this.normalizeGitRelativePath(path.relative(gitRoot, target.skillMdPath)));
      allowedByRoot.set(gitRoot, allowed);
    }
    return allowedByRoot;
  }

  private changedStatusPaths(
    before: SelfEvolutionGitRootSnapshot,
    after: SelfEvolutionGitRootSnapshot,
  ): string[] {
    const paths = new Set([
      ...Object.keys(before.changedPathFingerprints),
      ...Object.keys(after.changedPathFingerprints),
    ]);
    return Array.from(paths)
      .filter((changedPath) => before.changedPathFingerprints[changedPath] !== after.changedPathFingerprints[changedPath])
      .sort();
  }

  private async changedCommittedPaths(
    before: SelfEvolutionGitRootSnapshot,
    after: SelfEvolutionGitRootSnapshot,
  ): Promise<string[]> {
    if (!before.head || !after.head || before.head === after.head) {
      return [];
    }
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["-C", after.gitRootPath, "diff", "--name-only", before.head, after.head],
        { timeout: 5_000, maxBuffer: 1024 * 512 },
      );
      return stdout.split("\n").map((entry) => entry.trim()).filter(Boolean).map(this.normalizeGitRelativePath).sort();
    } catch {
      return [];
    }
  }

  private normalizeGitRelativePath = (relativePath: string): string => relativePath.replace(/\\/g, "/");
}
