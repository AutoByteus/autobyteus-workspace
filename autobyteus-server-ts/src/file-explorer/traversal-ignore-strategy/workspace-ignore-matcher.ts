import fs from "node:fs";
import path from "node:path";
import { DefaultIgnoreStrategy } from "./default-ignore-strategy.js";
import { GitIgnoreStrategy } from "./git-ignore-strategy.js";
import type { TraversalIgnoreStrategy } from "./traversal-ignore-strategy.js";

type GitIgnoreCacheEntry = {
  mtimeMs: number;
  size: number;
  strategy: GitIgnoreStrategy;
};

export class WorkspaceIgnoreMatcher {
  private workspaceRootPath: string;
  private baseStrategies: TraversalIgnoreStrategy[];
  private gitIgnoreCache = new Map<string, GitIgnoreCacheEntry>();

  constructor(workspaceRootPath: string, ignoreStrategies: TraversalIgnoreStrategy[]) {
    this.workspaceRootPath = path.resolve(workspaceRootPath);
    this.baseStrategies = [
      new DefaultIgnoreStrategy(this.workspaceRootPath),
      ...ignoreStrategies,
    ];
  }

  shouldIgnore(targetPath: string, isDirectory: boolean): boolean {
    const resolvedPath = path.resolve(targetPath);

    if (this.baseStrategies.some((strategy) => strategy.shouldIgnore(resolvedPath, isDirectory))) {
      return true;
    }

    let currentDir = path.dirname(resolvedPath);
    while (true) {
      const strategy = this.loadGitIgnoreStrategy(currentDir);
      if (strategy && strategy.shouldIgnore(resolvedPath, isDirectory)) {
        return true;
      }

      if (currentDir === this.workspaceRootPath || currentDir === path.dirname(currentDir)) {
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    return false;
  }

  shouldIgnoreForWatch(targetPath: string, stats?: fs.Stats): boolean {
    const resolvedPath = path.resolve(targetPath);
    if (resolvedPath === this.workspaceRootPath) {
      return false;
    }

    const candidateKinds = this.resolveCandidateKinds(resolvedPath, stats);
    return candidateKinds.some((isDirectory) => this.shouldIgnore(resolvedPath, isDirectory));
  }

  private resolveCandidateKinds(targetPath: string, stats?: fs.Stats): boolean[] {
    if (stats) {
      return [stats.isDirectory()];
    }

    try {
      return [fs.statSync(targetPath).isDirectory()];
    } catch {
      return [true, false];
    }
  }

  private loadGitIgnoreStrategy(directory: string): GitIgnoreStrategy | null {
    const gitignorePath = path.join(directory, ".gitignore");

    let stats: fs.Stats;
    try {
      stats = fs.statSync(gitignorePath);
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException;
      if (typedError.code === "ENOENT") {
        this.gitIgnoreCache.delete(directory);
      }
      return null;
    }

    const cached = this.gitIgnoreCache.get(directory);
    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
      return cached.strategy;
    }

    const strategy = new GitIgnoreStrategy(directory);
    this.gitIgnoreCache.set(directory, {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      strategy,
    });
    return strategy;
  }
}
