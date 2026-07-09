import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import type { SkillImprovementSkillTarget } from "../../domain/models.js";

export const SKILL_IMPROVEMENT_PACKAGE_TREE_MAX_DEPTH = 4;
export const SKILL_IMPROVEMENT_PACKAGE_TREE_MAX_ENTRIES = 80;

type RenderableEntry = {
  name: string;
  isDirectory: boolean;
  isEntryFile: boolean;
  children: RenderableEntry[];
  omittedChildCount: number;
};

type TraversalState = { includedEntryCount: number; omittedEntryCount: number };

const EXCLUDED_DIRECTORY_NAMES = new Set([
  "__pycache__", "build", "coverage", "dist", "node_modules", "out",
  "target", "tmp", "temp", "venv", "env",
]);

const EXCLUDED_FILE_NAMES = new Set([".ds_store", "thumbs.db", "desktop.ini"]);

const EXCLUDED_EXTENSIONS = new Set([
  ".7z", ".a", ".avi", ".bak", ".bin", ".bmp", ".class", ".db",
  ".dll", ".dmg", ".ear", ".exe", ".gif", ".gz", ".ico", ".jar",
  ".jpeg", ".jpg", ".log", ".mov", ".mp3", ".mp4", ".o", ".obj",
  ".pdf", ".png", ".pyc", ".rar", ".sqlite", ".sqlite3", ".tar",
  ".tgz", ".tmp", ".war", ".webp", ".zip",
]);

export class SkillImprovementSkillPackageTreeRenderer {
  private readonly maxDepth: number;
  private readonly maxEntries: number;

  constructor(options: { maxDepth?: number; maxEntries?: number } = {}) {
    this.maxDepth = options.maxDepth ?? SKILL_IMPROVEMENT_PACKAGE_TREE_MAX_DEPTH;
    this.maxEntries = options.maxEntries ?? SKILL_IMPROVEMENT_PACKAGE_TREE_MAX_ENTRIES;
  }

  async render(
    target: Pick<SkillImprovementSkillTarget, "skillRootPath" | "skillMdPath">,
  ): Promise<string> {
    const rootPath = path.resolve(target.skillRootPath);
    const entryPath = path.resolve(target.skillMdPath);
    const state: TraversalState = {
      includedEntryCount: 0,
      omittedEntryCount: 0,
    };

    if (!(await this.isReadableDirectory(rootPath))) {
      return ".\n└── ... (package root unavailable)";
    }

    const entries = await this.readDirectoryEntries(rootPath, rootPath, entryPath, 0, state);
    const lines = ["."];
    lines.push(...this.renderEntries(entries, ""));

    if (state.omittedEntryCount > 0) {
      lines.push(`└── ... (${state.omittedEntryCount} entries omitted)`);
    }

    return lines.join("\n");
  }

  private async readDirectoryEntries(
    directoryPath: string,
    rootPath: string,
    entryPath: string,
    currentDepth: number,
    state: TraversalState,
  ): Promise<RenderableEntry[]> {
    const candidates = await this.listIncludedCandidates(directoryPath, rootPath, state);
    const entries: RenderableEntry[] = [];

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (!candidate) {
        continue;
      }
      if (state.includedEntryCount >= this.maxEntries) {
        state.omittedEntryCount += candidates.length - index;
        break;
      }

      state.includedEntryCount += 1;
      const childDepth = currentDepth + 1;
      const renderableEntry: RenderableEntry = {
        name: candidate.name,
        isDirectory: candidate.isDirectory,
        isEntryFile: path.resolve(candidate.absolutePath) === entryPath,
        children: [],
        omittedChildCount: 0,
      };

      if (candidate.isDirectory) {
        if (childDepth < this.maxDepth) {
          renderableEntry.children = await this.readDirectoryEntries(
            candidate.absolutePath,
            rootPath,
            entryPath,
            childDepth,
            state,
          );
        } else {
          renderableEntry.omittedChildCount = await this.countIncludedCandidates(
            candidate.absolutePath,
            rootPath,
            state,
          );
          state.omittedEntryCount += renderableEntry.omittedChildCount;
        }
      }

      entries.push(renderableEntry);
    }

    return entries;
  }

  private renderEntries(entries: RenderableEntry[], prefix: string): string[] {
    const lines: string[] = [];
    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const label = [
        entry.name,
        entry.isDirectory ? "/" : "",
        entry.isEntryFile ? " [entry]" : "",
      ].join("");
      lines.push(`${prefix}${connector}${label}`);

      const children = [...entry.children];
      if (entry.omittedChildCount > 0) {
        children.push({
          name: `... (${entry.omittedChildCount} entries omitted)`,
          isDirectory: false,
          isEntryFile: false,
          children: [],
          omittedChildCount: 0,
        });
      }
      if (children.length > 0) {
        lines.push(...this.renderEntries(children, `${prefix}${isLast ? "    " : "│   "}`));
      }
    });
    return lines;
  }

  private async listIncludedCandidates(
    directoryPath: string,
    rootPath: string,
    state: TraversalState,
  ): Promise<Array<{ name: string; absolutePath: string; isDirectory: boolean }>> {
    let dirents: Dirent[];
    try {
      dirents = await fs.readdir(directoryPath, { withFileTypes: true });
    } catch {
      state.omittedEntryCount += 1;
      return [];
    }

    const candidates: Array<{ name: string; absolutePath: string; isDirectory: boolean }> = [];
    for (const dirent of dirents) {
      const absolutePath = path.join(directoryPath, dirent.name);
      const isDirectory = dirent.isDirectory();
      const isFile = dirent.isFile();
      if (!isDirectory && !isFile) {
        continue;
      }

      if (this.shouldExclude(absolutePath, rootPath, dirent.name, isDirectory)) {
        continue;
      }

      candidates.push({
        name: dirent.name,
        absolutePath,
        isDirectory,
      });
    }

    return candidates.sort((left, right) => this.compareEntries(left, right));
  }

  private async countIncludedCandidates(
    directoryPath: string,
    rootPath: string,
    state: TraversalState,
  ): Promise<number> {
    const candidates = await this.listIncludedCandidates(directoryPath, rootPath, state);
    return candidates.length;
  }

  private compareEntries(
    left: { name: string; isDirectory: boolean },
    right: { name: string; isDirectory: boolean },
  ): number {
    if (left.name === "SKILL.md" && right.name !== "SKILL.md") {
      return -1;
    }
    if (right.name === "SKILL.md" && left.name !== "SKILL.md") {
      return 1;
    }
    if (left.isDirectory !== right.isDirectory) {
      return left.isDirectory ? -1 : 1;
    }
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  }

  private shouldExclude(
    absolutePath: string,
    rootPath: string,
    name: string,
    isDirectory: boolean,
  ): boolean {
    const normalizedRelativePath = path.relative(rootPath, absolutePath).split(path.sep).join("/");
    const lowerName = name.toLowerCase();
    const lowerRelativePath = normalizedRelativePath.toLowerCase();

    if (!normalizedRelativePath || normalizedRelativePath.startsWith("../") || path.isAbsolute(normalizedRelativePath)) {
      return true;
    }
    if (name.startsWith(".")) {
      return true;
    }
    if (lowerRelativePath.includes("raw_traces") || lowerRelativePath.includes("raw-traces")) {
      return true;
    }
    if (isDirectory) {
      return EXCLUDED_DIRECTORY_NAMES.has(lowerName);
    }

    if (EXCLUDED_FILE_NAMES.has(lowerName)) {
      return true;
    }
    return EXCLUDED_EXTENSIONS.has(path.extname(lowerName));
  }

  private async isReadableDirectory(directoryPath: string): Promise<boolean> {
    try {
      const stats = await fs.lstat(directoryPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}
